import os
import telebot
import requests
from telebot import apihelper

# Токен бота и URL (оставлены жестко прописанными в коде)
TOKEN = ''
APP_URL = 'https://supportkmbp.webtm.ru/'
API_URL = APP_URL 

# Данные прокси
PROXY_HOST = '185.88.99.86'
PROXY_PORT = '8000'
PROXY_USER = 'n6CZUF'
PROXY_PASS = 'Py0CSG'

# Передаем словарь (dict), чтобы requests внутри telebot не падал
apihelper.proxy = {
    'http': f"http://{PROXY_USER}:{PROXY_PASS}@{PROXY_HOST}:{PROXY_PORT}",
    'https': f"http://{PROXY_USER}:{PROXY_PASS}@{PROXY_HOST}:{PROXY_PORT}"
}

bot = telebot.TeleBot(TOKEN)

@bot.message_handler(commands=['start'])
def send_welcome(message):
    args = message.text.split()
    if len(args) > 1:
        # .strip() убирает случайные пробелы, регистр букв (маленькие cuid) сохраняется
        token = args[1].strip()
        try:
            # Запрос к бэкенду для привязки аккаунта
            res = requests.post(f"{API_URL}/api/bot/link", json={
                "token": token,
                "telegramId": str(message.chat.id)
            })
            if res.status_code == 200:
                data = res.json()
                bot.reply_to(message, f"✅ Аккаунт привязан! Добро пожаловать, {data['nickname']}. Теперь вы будете получать уведомления здесь.")
                return
            else:
                bot.reply_to(message, "❌ Ошибка: Токен недействителен или срок его действия истек.")
        except Exception as e:
            bot.reply_to(message, f"❌ Ошибка связи с сервером SoulLink: {str(e)}")
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
        print(f"Бот запущен с прокси {PROXY_HOST}...")
        bot.infinity_polling()
