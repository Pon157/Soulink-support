import os
import telebot
from telebot import apihelper

# Proxy configuration provided by the user
PROXY = {
    "scheme": "http",
    "hostname": "185.88.99.86",
    "port": 8000,
    "username": "n6CZUF",
    "password": "Py0CSG"
}

# Set up proxy
apihelper.proxy = {
    'http': f"{PROXY['scheme']}://{PROXY['username']}:{PROXY['password']}@{PROXY['hostname']}:{PROXY['port']}",
    'https': f"{PROXY['scheme']}://{PROXY['username']}:{PROXY['password']}@{PROXY['hostname']}:{PROXY['port']}"
}

# Get token from environment
TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', 'YOUR_BOT_TOKEN_HERE')
APP_URL = os.getenv('APP_URL', 'https://supportkmbp.webtm.ru/')

bot = telebot.TeleBot(TOKEN)

@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    markup = telebot.types.InlineKeyboardMarkup()
    btn = telebot.types.InlineKeyboardButton("Открыть Мини-Приложение", url=APP_URL)
    markup.add(btn)
    
    bot.reply_to(message, "Привет! Я бот системы SoulLink. \n\nЗдесь ты будешь получать важные уведомления о варнах, новых постах и рассылки.", reply_markup=markup)

@bot.message_handler(func=lambda message: True)
def echo_all(message):
    bot.reply_to(message, "Я работаю в режиме уведомлений. Используйте кнопку /start для перехода в приложение.")

if __name__ == "__main__":
    print(f"Бот запущен с прокси {PROXY['hostname']}...")
    bot.infinity_polling()
