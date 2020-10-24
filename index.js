const songData = JSON.parse(DataBase.getDataBase('ArcaeaSongInfo.txt'));

const Request = function() {
  this.url = 'https://arcapi.lowiro.com/coffee/';
  this.method = 'GET';
  this.version = '12';
  this.appVersion = '3.2.1c';
  //this.userAgent = 'CFNetwork/758.3.15 Darwin/15.4.0';
  this.userAgent = 'CFNetwork/976 Darwin/18.2.0';
  this.auth = undefined;
  this.deviceId = '11bf5b37-e0b8-42e0-8dcf-dc8c4aefc000';
};

Request.prototype = {
  setAuth : function(authorization) {
    this.auth = authorization;
  },
  setMethod : function(method) {
    if(method == 'POST') this.method = 'POST';
    else this.method = 'GET';
  },
  send : function(address, jsonData) {
    let s = org.jsoup.Jsoup.connect(request.url + request.version + address);
    let json = {
      'Accept': '*/*',
      'AppVersion': this.appVersion,
      'DeviceId': this.deviceId,
      'Accept-Language': 'ko-KR',
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'Accept-Encoding': 'br, gzip, deflate',
      'User-Agent': 'Arc-mobile/' + this.appVersion + ' ' + this.userAgent
    }
    if(this.auth != undefined)
      json['Authorization'] = this.auth;
    let keys = Object.keys(json);
    for(let i in keys) {
      s = s.header(keys[i], json[keys[i]]);
    }
    if(this.method == 'GET') {
      if(jsonData != undefined) {
        let k = Object.keys(jsonData);
        for(let j in k)
          s = s.data(k[j], jsonData[k[j]]);
      }
      s = s.ignoreContentType(true)
      .ignoreHttpErrors(true)
      .get().text();
    }
    else if(this.method == 'POST') {
      if(jsonData != undefined) {
        let k = Object.keys(jsonData)[0];
        s = s.requestBody(k + '=' + jsonData[k]);
      }
      s = s.ignoreContentType(true)
      .ignoreHttpErrors(true)
      .post().text();
    }
    else return 'invalid method';
    return JSON.parse(s);
  },
  encodeBase64 : function(text) {
    return android.util.Base64.encodeToString(java.lang.String(text).getBytes("UTF-8"),android.util.Base64.DEFAULT).trim();
  }
};

let request = new Request();

const ArcApi = function() {
  this.processing = false;
};
ArcApi.prototype = {
  login: function(id, password) {
    request.setMethod('POST');
    request.setAuth('Basic ' + request.encodeBase64(id + ':' + password));
    let res = request.send('/auth/login');
    if(res.success) {
      Log.i('login success\n' + this.getStringJSON(res));
      request.setAuth('Bearer ' + res.access_token);
      return true;
    }
    else {
      Log.i('login\n' + this.getStringJSON(res));
      return false;
    }
  },
  getInfo: function() {
    request.setMethod('GET');
    let res = request.send('/user/me');
    if(res.success)
      return res.value;
    else {
      Log.i('getInfo\n' + this.getStringJSON(res));
      return false;
    }
  },
  addFriend: function(friendCode) {
    request.setMethod('POST');
    let res = request.send('/friend/me/add', {'friend_code' : friendCode});
    if(res.success)
      return res.value;
    else {
      Log.i('addFriend\n' + this.getStringJSON(res));
      return false;
    }
  },
  delFriend: function(/*friendId*/list) {
    /*
    request.setMethod('POST');
    let res = request.send('/friend/me/delete', {'friend_id': friendId});
    if(res.success)
      return res.value;
    else {
      Log.i('delFriend\n' + this.getStringJSON(res));
      return false;
    }
    */
    let log = '';
    let result = [];
    for(let i in list) {
      request.setMethod('POST');
      let res = request.send('/friend/me/delete', {'friend_id': list[i]});
      if(res.success)
        result.push(res.value);
      else {
        let temp = 'delFriend\n' + this.getStringJSON(res);
        if(i == 0) log += temp;
        else log += '\n--------\n' + temp;
      }
    }
    Log.i(log);
    return result;
  },
  getPlayData: function(subUrl, userId) {
    try {
      let songs = songData.songs;
      let res = [];
      songs.map(x => {
        for(let diff = 2; diff <= 3; diff++) {
          if(diff == 3 && x.difficulties[3]['rating'] == -1)
            continue;
          request.setMethod('GET');
          let playData = request.send(subUrl, {
            song_id: x.id,
            difficulty: diff,
            start: 0,
            limit: 10
          });
          let value = Array.from(playData.value)
          Log.i(this.getStringJSON(value))
          /*
          value.map(y => {
            if(userId && y.user_id != userId)
              return;
            let keys = Object.keys(value);
            let json = {};
            for(let i in keys) {
              if(userId != undefined && value['user_id'] != userId)
                continue;
              json[keys[i]] = value[keys[i]];
              //json = value;
            }
          });
          */
          if(value.join('') == '')
            return;
          res.push(value[0]);
        }
        
      });
      return res;
    }
    catch(e) {
      return 'error';
    }
  },
  getMyPlayData: function() {
    return this.getPlayData('/score/song/me');
  },
  getFriendPlayData: function(friendId) {
    return this.getPlayData('/score/song/friend', friendId);
  },
  getStringJSON: function(json) {
    return JSON.stringify(json, null, 4);
  },
  getBeautify: function(json) {
    try {
      let songInfo = songData.songs.find(x => x['id'] == json['song_id']);
    
      // string difficulty
      let difficulty = ['PRS', 'PST', 'FTR', 'BYD'];
      difficulty = difficulty[json['difficulty']];
      // string title
      let title = songInfo['title_localized']['en'];
      // string artist
      let artist = songInfo['artist'];
      // array [clear, bestClear]
      let clearType = [ 
        'Track Lost',
        'Normal Clear', 
        'Full Recall', 
        'Pure Memory', 
        'Easy Clear',
        'Hard Clear'
      ];
      clearType = [clearType[json['clear_type']], clearType[json['best_clear_type']]];
      // string score
      let score = json['score'].toString().replace(/\B(?=(\d{3})+(?!\d))/g,',') + 'pts';
      // array [pure, shiny, far, lost]
      let count = [
        json['perfect_count'],
        json['shiny_perfect_count'],
        json['near_count'],
        json['miss_count']
      ];
      // string time
      let time = new Date(Number(json['time_played']));
      
      let rating = songInfo['difficulties'][Number(json['difficulty'])];
      // array [rating, realRating]
      let level = [
        rating['rating'].toString().replace('.5', '+'),
        rating['ratingReal']
      ];
      // float ptt
      let ptt = this.getPTTByScore(level[1], Number(json['score']));
      
      return [
        [
          'title: ' + title,
          difficulty + ' ' + level[0] + '(' + level[1] + ')',
          'artist: ' + artist,
          'score: ' + score,
          count[0] + ' (' + count[1] + ') - ' + count[2] + ' - ' + count[3],
          'clear: ' + clearType[0] + (clearType[0] == clearType[1] ? '' : (' (best: ' + clearType[1] + ')')),
          'result rating: ' + Number(ptt.toFixed(5)),
          'cleared at: ' + time.toString().split('GMT')[0]
        ],
        Number(ptt.toFixed(5))
      ];
    }
    catch(e) {
      let data = songData.songs.find(x => x['id'] == json['song_id']);
      data = this.getStringJSON(data);
      return 'songdata:\n'+data + '\n\njsondata:\n'+this.getStringJSON(json)+'\n\n'+ e + '\nLine: ' + e.lineNumber;
    }
  },
  getDataByCode: function(code) {
    this.processing = true;
    let add = this.addFriend(code);
    Log.i(this.getStringJSON(add))
    let userId = add['user_id'];
    let res = this.getFriendPlayData(userId);
    let delList = this.getDelListByAdd(add);
    let del = this.delFriend(delList);
    Log.i(this.getStringJSON(del))
    let sorted = this.sortByPTT(res.map(x => this.getBeautify(x)));
    sorted.splice(30, sorted.length - 30);
    let playerInfo = this.getPlayerInfo(sorted, add);
    const allSee = '\u200b'.repeat(500 - playerInfo.length) + '\n\n';
    this.processing = false;
    return playerInfo + allSee + sorted.map(x => x[0].join('\n')).join('\n----------\n');
  },
  getPTTByScore: function (constant, score) { 
    if (score >= 10000000) return constant + 2; 
    else if (score >= 9800000) return constant + 1 + (score - 9800000) / 200000; 
    else return Math.max(constant + (score - 9500000) / 300000, 0);
  },
  sortByPTT: function(list) {
    return list.sort((a, b) => b[1] - a[1]);
  },
  getPlayerPTT: function(list, playerPTT) {
    //float best30 sum
    let best30 = 0;
    let length = list.length < 30 ? list.length : 30;
    for(let i = 0; i < length; i++) {
      best30 += list[i][1];
    }
    // float best10 sum
    let best10 = 0;
    length = list.length < 10 ? list.length : 10;
    for(let i = 0; i < length; i++) {
      best10 += list[i][1];
    }
    //float recent10 sum
    let recent10 = 40 * playerPTT - best30;
    //float maxPTT
    let maxPTT = (best30 + best10) / 40;
    
    best30 = best30 / 30;
    recent10 = recent10 / 10;
    return [best30, recent10, maxPTT];
  },
  getDelListByAdd: function(add) {
    let friends = add['friends'];
    let arr = [];
    for(let i in friends) {
      arr.push(friends[i]['user_id']);
    }
    return arr;
  },
  getPlayerInfo: function(sorted, add) {
    let playerInfo = add['friends'][0];
    // string name
    let name = playerInfo['name'];
    // string joinDate
    let joinDate = new Date(Number(playerInfo['join_date']));
    joinDate = joinDate.toString().split('GMT')[0];

    // float potential
    let nowPTT = Number(playerInfo['rating']) / 100;
    let playerPTT = this.getPlayerPTT(sorted, nowPTT);
    
    return [
      'player name: ' + name,
      'potential: ' + nowPTT.toFixed(2),
      'best 30 avg: ' + Number(playerPTT[0].toFixed(5)),
      'recent top 10 avg: ' + Number(playerPTT[1].toFixed(5)),
      'max potential: ' + Number(playerPTT[2].toFixed(5)),
      'registered at: ' + joinDate
    ].join('\n');
  }
};

let arc = new ArcApi();
arc.login('id', 'pw');

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
  try {
    if(msg.indexOf('/info ') == 0) {
      if(arc.processing) {
        replier.reply('it\'s already loading');
        return;
      }
      let code = msg.substr(6).replace(/[^0-9]/g, '').trim();
      if(code.length != 9) {
        replier.reply('only 9 digits');
        return;
      }
      replier.reply('loading...\nit takes some time');
      let res = arc.getDataByCode(code);
      replier.reply(res);  
    }
  }
  catch(e) {
    replier.reply('error');
    arc.processing = false;
    Log.i(e + '\nLine#' + e.lineNumber);
  }
}