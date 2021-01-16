/**
 * Load environment variables
 */
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.BOT_TOKEN, {polling: true});


const createSatelliteGif = require('./src/weather/index_sat');
const createCloudsGif = require('./src/weather/index_pre');

const fs = require('fs');
const path = require('path');
const downloadImage = require('./src/weather/tools/download-image');
const randomString = require('./src/weather/tools/randomString');

const PLACES = require('./src/weather/tools/places');
const SOLAR_HOLES = [
    '0094',
    '0131',
    '0171',
    '0193',
    '0211',
    '0304',
    '0335',
    '1600',
    '1700'
];
const SOLAR_PLOTS = [
    'HMIIF',
    'HMIBC'
];


bot.on('polling_error', function(error){ console.log(error); });

bot.on('message', (msg) => {
    console.log(msg);
});

const cron = require('node-cron');

(async () => {
    for (const [name, code] of Object.entries(PLACES)) {
        await createSatelliteGif(code);
        await createCloudsGif(code);
    }

    cron.schedule('*/15 * * * *', async () => {
        for (const [name, code] of Object.entries(PLACES)) {
            await createSatelliteGif(code);
            await createCloudsGif(code);
        }
    });
})();



bot.onText(/\/start/, (msg, match) => {
    const chatId = msg.chat.id;
    const message =
        `Привет. Умею присылать гифки погодных условий со спутника и прогнозы облачности.\n` +
        `\n` +
        `Облака со спутника /clouds_sat\n` +
        `Прогноз обласности /clouds_pre\n` +
        `\n` +
        `Вебкамеры /webcam`;

    bot.sendChatAction(chatId, 'typing');
    bot.sendMessage(chatId, message);
});

bot.onText(/\/webcam/, (msg, match) => {
    const chatId = msg.chat.id;
    const message =
        `Напишите в сообщении название места с камерой или выберите команду.\n` +
        `\n` +
        `78° — /svalbard — Шпицберген / Свальбард / Грумант\n` +
        `69° — /skibotn — Шиботн\n` +
        `69° — /tromso — Тромсе\n` +
        `68° — /abisko — Абиску\n` +
        `67° — /kiruna — Кируна\n` +
        `66° — /porjus — Порьюс / Йокмокк\n`;

    bot.sendChatAction(chatId, 'typing');
    bot.sendMessage(chatId, message);
});

bot.onText(/\/commands/, (msg, match) => {
    const chatId = msg.chat.id;
    let message =
        `/start\n` +
        `/commands — this list\n` +
        `\n` +
        `/solar — sun images and gifs\n` +
        `\n` +
        `/webcam — list of available webcams\n` +
        `\n` +
        `/clouds_sat — available regions for satellite maps\n` +
        `/clouds_pre — available regions for clouds coverage prediction\n` +
        `\n`;

    for (const [name, code] of Object.entries(PLACES)) {
        message +=
            `/clouds_sat_${name}\n` +
            `/clouds_pre_${name}\n` +
            `\n`;
    }

    bot.sendChatAction(chatId, 'typing');
    bot.sendMessage(chatId, message);
});

bot.onText(/\/cme_lollipop/, (msg, match) => {
    const chatId = msg.chat.id;

    const video = `https://iswa.gsfc.nasa.gov/IswaSystemWebApp/iSWACygnetStreamer?timestamp=2038-01-23+00%3A44%3A00&window=-1&cygnetId=261&t=${Date.now()}`;
    bot.sendChatAction(chatId, 'upload_video');
    bot.sendVideo(chatId, video);
});

bot.onText(/^\/solar$/, (msg, match) => {
    const chatId = msg.chat.id;
    let message =
        `Напишите в сообщении название места с камерой или выберите команду.\n` +
        `\n` +
        `/solar_map\n` +
        `\n` +
        `/solar_holes\n` +
        `/solar_plots\n` +
        `\n` +
        `48h movies:\n`;

    SOLAR_HOLES.forEach(element => {
        message += `/solar_holes_${element}\n`;
    })

    SOLAR_PLOTS.forEach(element => {
        message += `/solar_plots_${element}\n`;
    })

    bot.sendChatAction(chatId, 'typing');
    bot.sendMessage(chatId, message);
});

bot.onText(/((Р|р)укопись)|(^\/solar_map$)/, (msg, match) => {
    const chatId = msg.chat.id;

    const mediaGroup = [{
        type: 'photo',
        media: `https://services.swpc.noaa.gov/images/synoptic-map.jpg?${Date.now()}`
    }];

    bot.sendChatAction(chatId, 'upload_photo');
    bot.sendMediaGroup(chatId, mediaGroup);
});

bot.onText(/^\/solar_holes$/, (msg, match) => {
    const chatId = msg.chat.id;
    const size = 1024;

    const mediaGroup = [];

    SOLAR_HOLES.forEach(element => {
        mediaGroup.push({
            type: 'photo',
            media: `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_${size}_${element}.jpg?${Date.now()}`
        })
    })

    bot.sendChatAction(chatId, 'upload_photo');
    bot.sendMediaGroup(chatId, mediaGroup);
});

bot.onText(/^\/solar_holes_(\d{4})$/, (msg, match) => {
    const chatId = msg.chat.id;
    const element = match[1];
    const mediaGroup = [];

    if (element in SOLAR_HOLES) return;

    mediaGroup.push({
        type: 'video',
        media: `https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_${element}.mp4?${Date.now()}`
    })

    bot.sendChatAction(chatId, 'upload_video');
    bot.sendMediaGroup(chatId, mediaGroup);
});

bot.onText(/^\/solar_plots$/, (msg, match) => {
    const chatId = msg.chat.id;
    const size = 1024;

    const mediaGroup = [];

    SOLAR_PLOTS.forEach(element => {
        mediaGroup.push({
            type: 'photo',
            media: `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_${size}_${element}.jpg?${Date.now()}`
        })
    });

    bot.sendChatAction(chatId, 'upload_photo');
    bot.sendMediaGroup(chatId, mediaGroup);
});

bot.onText(/^\/solar_plots_(\w{5})$/, (msg, match) => {
    const chatId = msg.chat.id;
    const element = match[1];
    const mediaGroup = [];

    if (element in SOLAR_PLOTS) return;

    mediaGroup.push({
        type: 'video',
        media: `https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_${element}.mp4?${Date.now()}`
    })

    bot.sendChatAction(chatId, 'upload_video');
    bot.sendMediaGroup(chatId, mediaGroup);
});

bot.onText(/\/clouds_sat(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;

    let place = match[1];

    /**
     * Remove bot's name
     */
    if (place.indexOf('@') !== -1) {
        place = place.substring(0, place.indexOf('@'));
    }

    /**
     * Remove _
     * @type {string}
     */
    place = place.substring(place.indexOf("_") + 1);

    if (place in PLACES) {
        const gifPath = path.join(__dirname, 'src', 'weather', 'output', `sat_${PLACES[place]}_latest.mp4`);

        if (!fs.existsSync(gifPath)) {
            const message = `Gif is not ready. Try again in 15 minutes.`;

            bot.sendChatAction(chatId, 'typing');
            bot.sendMessage(chatId, message);
            return;
        }

        bot.sendChatAction(chatId, 'upload_video');
        bot.sendVideo(chatId, gifPath);
    } else {
        const message =
            `Satellite clouds maps for regions:\n` +
            `\n` +
            `/clouds_sat_EUROPE\n` +
            `\n` +
            `/clouds_sat_LENINGRAD\n` +
            `\n` +
            `/clouds_sat_KARELIA\n` +
            `\n` +
            `/clouds_sat_MURMANSK\n` +
            `\n` +
            `/clouds_sat_TVER\n` +
            `\n` +
            `/clouds_sat_MOSCOW\n`;

        bot.sendChatAction(chatId, 'typing');
        bot.sendMessage(chatId, message);
    }
});

bot.onText(/\/clouds_pre(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;

    let place = match[1];

    /**
     * Remove bot's name
     */
    if (place.indexOf('@') !== -1) {
        place = place.substring(0, place.indexOf('@'));
    }

    /**
     * Remove _
     * @type {string}
     */
    place = place.substring(place.indexOf("_") + 1);

    if (place in PLACES) {
        const gifPath = path.join(__dirname, 'src', 'weather', 'output', `pre_${PLACES[place]}_latest.mp4`);

        if (!fs.existsSync(gifPath)) {
            const message = `Gif is not ready. Try again in 15 minutes.`;

            bot.sendChatAction(chatId, 'typing');
            bot.sendMessage(chatId, message);
            return;
        }

        bot.sendChatAction(chatId, 'upload_video');
        bot.sendVideo(chatId, gifPath);
    } else {
        const message =
            `Cloud coverage prediction for regions:\n` +
            `\n` +
            `/clouds_pre_EUROPE\n` +
            `\n` +
            `/clouds_pre_LENINGRAD\n`+
            `\n` +
            `/clouds_pre_KARELIA\n` +
            `\n` +
            `/clouds_pre_MURMANSK\n` +
            `\n` +
            `/clouds_pre_TVER\n` +
            `\n` +
            `/clouds_pre_MOSCOW\n` ;

        bot.sendChatAction(chatId, 'typing');
        bot.sendMessage(chatId, message);
    }
});

const SEND_WITHOUT_DOWNLOAD = !false;

bot.onText(/((S|s)valbard)|((Ш|ш)пиц)|((С|с)вал(ь?)бар(т|д))|((Г|г)руман(т|д))/, async (msg, match) => {
    const chatId = msg.chat.id;
    let photo = `https://aurorainfo.eu/aurora-live-cameras/svalbard-norway-all-sky-aurora-live-camera.jpg?t=${Date.now()}`;

    if (!SEND_WITHOUT_DOWNLOAD) {
        photo = await downloadImage(photo, path.join(__dirname, 'temp', `${randomString()}.jpg`));
    }

    bot.sendChatAction(chatId, 'upload_photo');
    await bot.sendPhoto(chatId, photo);

    if (!SEND_WITHOUT_DOWNLOAD) { try { fs.unlinkSync(photo) } catch (e) {} }
});

bot.onText(/((K|k)iruna)|(К|к)ирун(а|е)/, async (msg, match) => {
    const chatId = msg.chat.id;
    let photo = `https://aurorainfo.eu/aurora-live-cameras/kiruna-sweden-all-sky-aurora-live-camera.jpg?t=${Date.now()}`;

    if (!SEND_WITHOUT_DOWNLOAD) {
        photo = await downloadImage(photo, path.join(__dirname, 'temp', `${randomString()}.jpg`));
    }

    bot.sendChatAction(chatId, 'upload_photo');
    await bot.sendPhoto(chatId, photo);

    if (!SEND_WITHOUT_DOWNLOAD) { try { fs.unlinkSync(photo) } catch (e) {} }
});

bot.onText(/((P|p)orjus)|((П|п)ор((д?)жу|ью)с)|((Й|й)окмок(к?))/, async (msg, match) => {
    const chatId = msg.chat.id;

    let photos = [
        `https://aurorainfo.eu/aurora-live-cameras/porjus-sweden-north-view-sweden-aurora-live-camera.jpg?t=${Date.now()}`,
        `https://aurorainfo.eu/aurora-live-cameras/porjus-sweden-west-view-aurora-live-camera.jpg?t=${Date.now()}`,
        `https://aurorainfo.eu/aurora-live-cameras/porjus-sweden-east-view-sweden-aurora-live-camera.jpg?t=${Date.now()}`
    ];

    if (!SEND_WITHOUT_DOWNLOAD) {
        photos[0] = await downloadImage(photos[0], path.join(__dirname, 'temp', `${randomString()}.jpg`));
        photos[1] = await downloadImage(photos[1], path.join(__dirname, 'temp', `${randomString()}.jpg`));
        photos[2] = await downloadImage(photos[2], path.join(__dirname, 'temp', `${randomString()}.jpg`));
    }

    bot.sendChatAction(chatId, 'upload_photo');
    await bot.sendMediaGroup(chatId, [
        {
            type: 'photo',
            media: photos[0]
        },
        {
            type: 'photo',
            media: photos[1]
        },
        {
            type: 'photo',
            media: photos[2]
        },
    ]);

    if (!SEND_WITHOUT_DOWNLOAD) { try {
        fs.unlinkSync(photos[0]);
        fs.unlinkSync(photos[1]);
        fs.unlinkSync(photos[2]);
    } catch (e) {} }
});

bot.onText(/((A|a)bisko)|(А|а)биск(о|у)/, async (msg, match) => {
    const chatId = msg.chat.id;

    let photos = [
        `https://aurorainfo.eu/aurora-live-cameras/abisko-lights-over-lapland-sweden-aurora-live-camera.jpg?t=${Date.now()}`,
        `https://aurorainfo.eu/aurora-live-cameras/abisko-lights-over-lapland-sweden-aurora-live-camera-east.jpg?t=${Date.now()}`
    ];

    if (!SEND_WITHOUT_DOWNLOAD) {
        photos[0] = await downloadImage(photos[0], path.join(__dirname, 'temp', `${randomString()}.jpg`));
        photos[1] = await downloadImage(photos[1], path.join(__dirname, 'temp', `${randomString()}.jpg`));
    }

    bot.sendChatAction(chatId, 'upload_photo');
    await bot.sendMediaGroup(chatId, [
        {
            type: 'photo',
            media: photos[0]
        },
        {
            type: 'photo',
            media: photos[1]
        }
    ]);

    if (!SEND_WITHOUT_DOWNLOAD) { try {
        fs.unlinkSync(photos[0]);
        fs.unlinkSync(photos[1]);
    } catch (e) {} }
});

bot.onText(/((S|s)kibotn)|((Ш|ш)|(Ск|ск))ибот(н?)/, async (msg, match) => {
    const chatId = msg.chat.id;

    let photo = `https://aurorainfo.eu/aurora-live-cameras/skibotn-norway-all-sky-aurora-live-camera.jpg?t=${Date.now()}`;

    if (!SEND_WITHOUT_DOWNLOAD) {
        photo = await downloadImage(photo, path.join(__dirname, 'temp', `${randomString()}.jpg`));
    }

    bot.sendChatAction(chatId, 'upload_photo');
    await bot.sendPhoto(chatId, photo);

    if (!SEND_WITHOUT_DOWNLOAD) { try { fs.unlinkSync(photo) } catch (e) {} }
});

bot.onText(/((R|r)amfjord)|((T|t)roms(e|o))|(Т|т)ромс((е|ё)?)/, async (msg, match) => {
    const chatId = msg.chat.id;

    let photo = `https://aurorainfo.eu/aurora-live-cameras/ramfjordmoen-norway-all-sky-aurora-live-camera.jpg?t=${Date.now()}`;

    if (!SEND_WITHOUT_DOWNLOAD) {
        photo = await downloadImage(photo, path.join(__dirname, 'temp', `${randomString()}.jpg`));
    }

    bot.sendChatAction(chatId, 'upload_photo');
    await bot.sendPhoto(chatId, photo);

    if (!SEND_WITHOUT_DOWNLOAD) { try { fs.unlinkSync(photo) } catch (e) {} }
});

bot.onText(/((Т|т)е(з|с)ис)|((Л|л)ебедев)/, async (msg, match) => {
    const chatId = msg.chat.id;

    let photo = `https://tesis.lebedev.ru/upload_test/files/fc.png?t=${Date.now()}`;

    if (!SEND_WITHOUT_DOWNLOAD) {
        photo = await downloadImage(photo, path.join(__dirname, 'temp', `${randomString()}.jpg`));
    }

    bot.sendChatAction(chatId, 'upload_photo');
    await bot.sendPhoto(chatId, photo);

    if (!SEND_WITHOUT_DOWNLOAD) { try { fs.unlinkSync(photo) } catch (e) {} }
});
