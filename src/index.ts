import login from 'facebook-chat-api';
import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';

const btn = {
    inlineReply: function (text, callback_data) {
        return {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: text,
                        callback_data: callback_data
                    }]
                ]
            }
        };
    }
};

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, {
    polling: true
});
const chatId = process.env.TELEGRAM_CHAT_ID;

interface PureCredentials {
    email: string,
    password: string
}

interface CachedCredentials {
    appState: any
}

type Credentials = CachedCredentials | PureCredentials;


let credentials: Credentials = {
    email: process.env.FB_EMAIL,
    password: process.env.FB_PASSWORD
};

if (fs.existsSync('appstate.json')) {
    credentials = {
        appState: JSON.parse(fs.readFileSync('appstate.json', 'utf8'))
    };
}

var currentThread = '';

// Create simple echo bot
login(credentials, (err, api) => {
    if(err) return console.error(err);

    fs.writeFileSync('appstate.json', JSON.stringify(api.getAppState()));

    api.listenMqtt((err, message) => {
        var name = "";
        var groupName = "";
        if (message.type != "message") {
            return;
        }
        api.getThreadInfo(message.threadID, function (err_1, ret_1) {
            if (err_1) return console.error(err_1);
            if (ret_1.name) groupName = ret_1.name;


            api.getUserInfo([message.senderID], function (err, ret) {
                if (err) return console.error(err);
                for (var prop in ret) {
                    if (ret.hasOwnProperty(prop) && ret[prop].name) {
                        name = ret[prop].name
                    }
                }
                switch (message.type) {
                    case "message":
                        if (message.attachments.length > 0) {
                            var i = 0;
                            for (i = 0; i < message.attachments.length; i++) {
                                console.log(message.attachments[i].type);
                                console.log(message.attachments[i]);
                                switch (message.attachments[i].type) {
                                    case 'photo':
                                        bot.sendPhoto(chatId, message.attachments[i].url, {caption: "Sent by: " + name});
                                        break;
                                    case 'video':
                                        bot.sendVideo(chatId, message.attachments[i].url, {caption: "Sent by: " + name});
                                        break;
                                    case 'audio':
                                        bot.sendAudio(chatId, message.attachments[i].url, {caption: "Sent by: " + name});
                                        break;
                                    case 'animated_image':
                                        bot.sendDocument(chatId, message.attachments[i].url, {caption: "Sent by: " + name});
                                        break;
                                    case 'sticker':
                                        bot.sendPhoto(chatId, message.attachments[i].url, {caption: "Sent by: " + name});
                                        break;
                                    default:
                                        bot.sendMessage(chatId, "Something went wrong :S");
                                }
                            }

                        } else {
                            if (groupName === "") {
                                bot.sendMessage(chatId, groupName.substring(0, 30) + ' (' + name + '): ' + message.body,
                                    btn.inlineReply('✏️ Respond to ' + name, message.threadID));
                            } else {
                                bot.sendMessage(chatId, groupName.substring(0, 30) + ' (' + name + '): ' + message.body,
                                    btn.inlineReply('✏️ Respond to ' + name + " in " + groupName, message.threadID));
                            }

                        }
                        break;
                    case 'read_receipt':
                        bot.sendMessage(chatId, name + ' (Messenger): ✅ Seen ✅');
                        break;
                    default:
                        bot.sendMessage(chatId, ' ERROR: This type does not exist' + message.type);
                }

            });

        });

        //api.sendMessage(message.body, message.threadID);
    });

    bot.on('callback_query', function(msg) {
        var data = msg.data;
        currentThread = data;
        bot.sendMessage(msg.from.id, "Changed group/user");
    });

    bot.on('message', function (msg) {
        if (currentThread !== "") {
            api.sendMessage(msg.text, currentThread);
            bot.sendMessage("Sent message to " + currentThread);
        } else {
            bot.sendMessage(chatId, 'Nobody to send a message to :(');
        }

    });

    bot.on('photo', function(msg) {
        if (currentThread !== "") {
            bot.downloadFile(msg.photo[msg.photo.length - 1].file_id, './images').then(function(path) {
                console.log(path);
                var msg = {
                    body: "",
                    attachment: fs.createReadStream(path)
                }
                api.sendMessage(msg, currentThread);

            });


        } else {
            bot.sendMessage(chatId, 'Nobody to send a picture to :(');
        }

    });
});