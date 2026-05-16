import os
import telebot
import requests
from telebot import apihelper

# Token from environment
TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
APP_URL = os.getenv('APP_URL', 'https://your-app-url.ais.studio')
# Deriving API URL from app preview URL if needed, but here they are likely identical for server routes
API_URL = APP_URL 

# Proxy configuration
PROXY_HOST = os.getenv('TELEGRAM_BOT_PROXY_HOST')
PROXY_PORT = os.getenv('TELEGRAM_BOT_PROXY_PORT')
PROXY_USER = os.getenv('TELEGRAM_BOT_PROXY_USER')
PROXY_PASS = os.getenv('TELEGRAM_BOT_PROXY_PASS')

if PROXY_HOST:
    apihelper.proxy = {
        'http': f"http://{PROXY_USER}:{PROXY_PASS}@{PROXY_HOST}:{PROXY_PORT}",
        'https': f"http://{PROXY_USER}:{PROXY_PASS}@{PROXY_HOST}:{PROXY_PORT}"
    }

bot = telebot.TeleBot(TOKEN)

@bot.message_handler(commands=['start'])
def send_welcome(message):
    args = message.text.split()
    if len(args) > 1:
        token = args[1].strip().upper()
        print(f"Попытка привязки с токеном: {token}")
        try:
            # Call backend to link account
            res = requests.post(f"{API_URL}/api/bot/link", json={
                "token": token,
                "telegramId": str(message.chat.id)
            })
            if res.status_code == 200:
                data = res.json()
                bot.reply_to(message, f"✅ Аккаунт привязан! Добро пожаловать, {data['nickname']}. Теперь вы будете получать уведомления здесь.")
                print(f"Успешная привязка: {data['nickname']}")
                return
            else:
                error_msg = res.json().get('error', 'Неизвестная ошибка')
                print(f"Ошибка привязки (Status {res.status_code}): {error_msg}")
                bot.reply_to(message, f"❌ Ошибка: {error_msg}. Проверьте правильность кода или получите новый в настройках.")
        except Exception as e:
            print(f"Исключение при связи с сервером: {str(e)}")
            bot.reply_to(message, f"❌ Ошибка связи с сервером SoulLink. Попробуйте позже.")
            return

    markup = telebot.types.InlineKeyboardMarkup()
    btn = telebot.types.InlineKeyboardButton("Открыть Мини-Приложение", url=APP_URL)
    markup.add(btn)
    
    bot.reply_to(message, "Привет! Я бот SoulLink. \n\nЧтобы привязать аккаунт и получать личные уведомления, перейдите в профиль -> настройки и получите пригласительный токен.", reply_markup=markup)

@bot.message_handler(func=lambda message: True)
def echo_all(message):
    bot.reply_to(message, "Я работаю в режиме уведомлений. Используйте Мини-Приложение для общения.")

if __name__ == "__main__":
    if not TOKEN:
        print("ОШИБКА: TELEGRAM_BOT_TOKEN не установлен!")
    else:
        print(f"Бот запущен...")
        bot.infinity_polling()
