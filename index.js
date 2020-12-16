//import dependencies
const Discord = require('discord.js');
const {
    prefix,
    token,
} = require('./config.json');
const ytdl = require('ytdl-core');
const { executionAsyncResource } = require('async_hooks');

//client login
const client = new Discord.Client();
client.login(token)

//basic listeners
client.once('ready', () => {
    console.log('Ready!');
});
client.once('reconnecting', () => {
    console.log('Reconnecting!');
});
client.once('disconnect', () => {
    console.log('Disconnect!');
});


//read message
client.on('message', async message => {
    if (message.author.bot) return;

    //check prefix
    if (!message.content.startsWith(prefix)) return;

    //check command
    const serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith(`${prefix}play`)) {
        execute(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}skip`)) {
        skip(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}stop`)) {
        stop(message, serverQueue);
        return;
    } else {
        message.channel.send("You need to enter a valid command!");
    }
})

const queue = new Map();

//async function to join channel
async function execute(message, serverQueue) {
    //split user message
    const args = message.content.split(" ");

    const voiceChannel = message.member.voice.channel;

    //validate voice channel
    if (!voiceChannel)
        return message.channel.send(
            "You need to be in a voice channel to play music!"
        );

    //check permissions
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
            "I need the permissions to join and speak in your voice channel!"
        );
    }

    //get song information
    const songInfo = await ytdl.getInfo(args[1]);
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
    };

    //add song to server queue
    if (!serverQueue) {

    } else {
        serverQueue.songs.push(song);
        console.log(serverQueue.songs);
        return message.channel.send(`${song.title} has been added to the queue!`);
    }

    //create contract for serverqueue
    const queueContruct = {
        textChannel: message.channel,
        voiceChannel: voiceChannel,
        connection: null,
        songs: [],
        volume: 5,
        playing: true,
    };

    //set queue from contract
    queue.set(message.guild.id, queueContruct);
    queueContruct.songs.push(song);

    //attempty connection
    try {
        //save connection
        var connection = await voiceChannel.join();
        queueContruct.connection = connection;
        //play song
        play(message.guild, queueContruct.songs[0]);
    } catch (err) {
        console.log(err);
        queue.delete(message.guild.id)
        return message.channel.send(err);
    }
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }
    //play song
    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Started playing: **${song.title}**`)
    song.
}

//skipping songs
function skip(message, serverQueue) {
    if (!message.member.voice.channel) {
        return message.channel.send(
            "You have to be in a voice channel to stop the music!"
        );
    }
    if (!serverQueue) {
        return message.channel.send("There is no song to skip")
    }

    serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "You have to be in a voice channel to stop the music!"
        );
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}
