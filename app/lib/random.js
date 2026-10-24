/*jslint node: true */
"use strict";

// Seed math

exports.random = x => {
    return x * Math.random();
};

exports.randomAngle = () => {
    return Math.PI * 2 * Math.random();
};

exports.randomRange = (min, max) => {
    return Math.random() * (max - min) + min;
};

exports.irandom = i => {
    let max = Math.floor(i);
    return Math.floor(Math.random() * (max + 1)); //Inclusive
};

exports.irandomRange = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //Inclusive
};

exports.gauss = (mean, deviation) => {
    let x1, x2, w;
    do {
        x1 = 2*Math.random() - 1;
        x2 = 2*Math.random() - 1;
        w = x1 * x1 + x2 * x2;
    } while (0 == w || w >= 1);

    w = Math.sqrt(-2 * Math.log(w) / w);
    return mean + deviation * x1 * w;
};

exports.gaussInverse = (min, max, clustering) => {
    let range = max - min;
    let output = exports.gauss(0, range / clustering);

    while (output < 0) {
        output += range;
    }
    
    while (output > range) {
        output -= range;
    }
    
    return output + min;
};

exports.gaussRing = (radius, clustering) => {
    let r = exports.random(Math.PI * 2);
    let d = exports.gauss(radius, radius*clustering);
    return {
        x: d * Math.cos(r),
        y: d * Math.sin(r),
    };
};

exports.chance = prob => {
    return exports.random(1) < prob;
};

exports.dice = sides => {
    return exports.random(sides) < 1;
};

exports.choose = arr => {
    return arr[exports.irandom(arr.length - 1)];
};

exports.chooseN = (arr, n) => {
    let o = [];
    for (let i=0; i<n; i++) {
        o.push(arr.splice(exports.irandom(arr.length - 1), 1)[0]);
    }
    return o;
};

exports.chooseChance = (...arg) => {
    let totalProb = 0;
    arg.forEach(function(value) { totalProb += value; });
    let answer = exports.random(totalProb);
    for (let i=0; i<arg.length; i++) {
        if (answer<arg[i]) return i;
        answer -= arg[i];
    }
};


exports.chooseBotName = () => {
    return exports.choose([
        'Silas',
      'Arlo',
      'Luna',
      'Hugo',
      'Cora',
      'Milo',
      'Ava',
      'Finn',
      'Jude',
      'Kai',
      'Ezra',
      'Miles',
       'Lucy',   
      'Theo',
      'Lyra',
      'James',
      'Noah',
      'Remy',
      'Ada',
      'Luke',
      'Drake',
      'Bob',
      'Jack',
      'Elija',
      "manhunt", 
      "growth", 
      "Dreadnaughts", 
      "Outbreak", "graveyard", "soccer", "Arms Race", "half", "tetrimino", "Retro", "growth", "Pandemic", "elimination", "TDM", "FFA", "domination", "siege", "Tag", "assault", "Arras.io", "diep.io", "scenexe.io", "spaceblast.io", "obstar.io", "oxyrex.io", "woomy", "fallen boster", "Fallen Booster", "Overlord", "[Clan] Wars", "skinwalkers", "sandbox", "fallen overlord", "valrayvn", "damocles", "twyll(REAL)", "Valravyn(100% NOT FAKE!)", "Goofy ahh", "amongus", "Corrupt x", "Corrupt Y", "Corrupt Z", "Alexthegudgamer", "anoying hog", "who tf is dreygos?", "spawn of dreygos", "[Dev] Dev", "I am not a bot", "REAL PLAYER!", "BED_NUB", "[AI]_[AI]_[AI]_", "jessica", "jessie", "become spike and bounce!", "Roger",
      "doofus",
      "GET BONKED",
      "Donald",
      "Trump",
      "Joe",
      "Peter",
      "Glenn",
      "Joseph",
      "Caeser",
      "nightowl",
      "Jaclynne",
      "Jacky",
      "Hank", 
      "Bobby",
      "Chuck Norris",
      "Celldweller",
      "Twyll Cultist",
      "Twyll Acolyte", 
      "WHO TF IS TWYLL!?",
      "OMG ITS THE DEV!1!1!1!",
      "Twyll Cult Leader",
      "TESTBED PLS!",
      "TESTBED HOW!??",
      "Shiny Finder",
      "Shiny Hunter",
      "Hunter",
     "Hacker",
      "Pro",
      "Newb", 
      "Noob",
      "Nub",
      "Griefer",
      "Low-life",
      "'lol you died'",
      "Neph",
      "Arena Closer",
      "Server Ender",
      "I am god!!",
      "He is god!!",
      "That guy is god!!(I guess)",
      "Teamer",
      "Team Hotel",
      "Hotel Guard", 
      "TEAM POLICE",
      "Anti-Teamer",
      "Obsessed Anti-Teamer",
      "Spin=Team",
      "Super Spin=SUPER TEAM!!!",
      "Spin for shower",
      "Spin for acid shower",
      "Wish Master",
      "e g g",
      "E G G",
      "Cubed",
      "ADD CHAT!!!",
      "Signaling Godlike Entity...",
      "Jeremy",
      "Disturbed",
      "Gorillaz",
      "Vanilla Ice",
      "Run DMC",
      "Circle of Dust",
      "Scandroid",
      "Ministry",
      "Godsmack",
      "5 Finger Death Punch", 
      "Halestorm",
      "Alestorm",
      "Devs Pls,Plz,Pls,Devs pls?",
      "Press o",
      "CTRL+W+ENTER=SECRET CHEATS!!",
      "CTRL+R+ENTER=SECRET CHEATS!!",
      "kys because i suck",
      "git gud(cant spell)",
      "damocles",
      "Stark109",
      "Rog456",
      "O'Chunks",
      "Gizmic",
      "Traitor",
      "Betrayer", 
      "This server suqs",
      "World Record Breaker",
      "#bonker4lyfe",
      "Runar, Protector of Derp",
      "Twill, The Dum guy",
      "vRUH",
      "Jakob",
      "Tyler",
      "BEAST", 
      "Meg",
      "NERF EVERYTHING!!!!",
      "I FOUND AN EGG!!!!",
      "Overlord OP, NERF!",
      "Anni OP, NERF!",
      "G4NG",
      "Jay. Jay.",
      "Za Beep",
      "Deth Shawt",
      "Take 1 Dmg=RAGE QUIT!",
      "Witch Hunter",
      "Penta-GONE",
      "Left Hand of Fate",
      "Typical utoober",
      "Youtuber",
      "Metuber",
      "Right Hand of Fate",
      "Black Hand of Fate",
      "Kris Cant Tap!!!!",
      "awootoob",
      "GG!",
      "ANTI-EVERYTHING GUN",
      "Tank",
      "midget spinner",
      "f in the cha- nvm",
      "ROOT BEER, ROOT BEER NO!",//we all know what this is about
      "I live in Spain without the A",
      "GUH DUH??",
      "hawk TUAH",
      
    ]);
};
exports.chooseBossBotName = () => {
    return exports.choose([
      
              "Nyarlathotep",
              "Tenebrosum",
              "Derleth",
              "Azathoth",
              "Oukranos",
            "Xerxes",
            "Cipher",
            "Aegis",
            "Helios",
            "Calypso",
            "Kelthuzad",
            "Mannimarco",
            "Ulric",
            "Marrowgar",
            "Thaddius"
    ]);
};
exports.chooseBossName = (code, n) => {
    switch (code) {
    case 'elite':
    return exports.chooseN([
        'Archimedes',
        'Akilina',
        'Anastasios',
        'Athena',
        'Alkaios',
        'Amyntas',
        'Aniketos',
        'Artemis',
        'Anaxagoras',
        'Apollon',
        'Apophis',
    ], n);
        case 'undead':
    return exports.chooseN([
        'Alatar',
        'Bellamy',
        'Blaise',
        'Darco',
        'Dune',
        'Lazarus',
        'Bronel',
        'Bronwen',
        'Brunella',
      'Adrian',
      'Auditore',
      'Ezio',
      'Kain',
      'Logan',
      'Morpheus',
      'Vorador',
      
    ], n);
   
    case 'castle':
    return exports.chooseN([
        'Berezhany',
        'Lutsk',
        'Dobromyl',
        'Akkerman',
        'Palanok',
        'Zolochiv',
        'Palanok',
        'Mangup',
        'Olseko',
        'Brody',
        'Isiaslav',
        'Kaffa',
        'Bilhorod',
    ], n);
      
       case 'Arena':
    return exports.chooseN([
      'Azathoth',
      'Dren',
      'Daedroth',
      'Tarkinos',
      'Zarkas',
      'Loknad',
      'Keylin',
      ], n); 
        case 'Mystic':
    return exports.chooseN([
      'Jill',
      'Tyrin',
      'Nox',
      'Clay',
      'Natdrean',
      'Varkin',
      'Glade',
      'Shard',
      'Lothad',
      'Therin',
      'Drex',
      'Sepherim',
      'Aefis',
      'Nostada',
      'Skale'
      ], n);
        case 'Zombie':
    return exports.chooseN([
      'Anubis'
      ], n);  
        case 'Guardian':
    return exports.chooseN([
      'Twilight<3'
      ], n);
    default: return 'God';
    }
};
