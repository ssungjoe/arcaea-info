const songData = JSON.parse(DataBase.getDataBase('ArcaeaSongInfo.txt'));

const Request = function() {
  this.url = 'https://arcapi.lowiro.com/coffee/';
  this.method = 'GET';
  this.version = '12';
  this.appVersion = '3.2.1c';
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
      'User-Agent': this.userAgent
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

const ArcApi = function() {};
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
  delFriend: function(friendId) {
    request.setMethod('POST');
    let res = request.send('/friend/me/delete', {'friend_id': friendId});
    if(res.success)
      return res.value;
    else {
      Log.i('delFriend\n' + this.getStringJSON(res));
      return false;
    }
  },
  getPlayData: function(subUrl, userId) {
    try {
      let songs = songData.songs;
      let res = [];
      songs.map(x => {
        /*
        request.setMethod('GET');
        let playData = request.send(subUrl, {
          song_id: x.id,
          difficulty: 2,
          start: 0, 
          limit: 10
        });
        let value = playData.value;
        Log.i(this.getStringJSON(value))
        let keys = Object.keys(value);
        let json = {};
        for(let i in keys) {
          if(userId != undefined && value['user_id'] != userId)
              continue;
          json[keys[i]] = value[keys[i]];
          //json = value;
        }
        res.push(json);
        */
        
        //for(let diff = 0; diff <= 2; diff++) {
        let diff = 2;
          request.setMethod('GET');
          let playData = request.send(subUrl, {
            song_id: x.id,
            difficulty: diff,
            start: 0,
            limit: 10
          });
          let value = Array.from(playData.value)
          //Log.i(this.getStringJSON(value))
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
          res.push(value[0]);
        //}
        
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
          'clear: ' + clearType[0] +  (clearType[0] == clearType[1] ? '' : (' (best: ' + clearType[1] + ')')),
          'result rating: ' + Number(ptt.toFixed(5)),
          'cleared at: ' + time.split('GMT')[0]
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
    let add = this.addFriend(code);
    Log.i(this.getStringJSON(add))
    let userId = add['user_id'];
    let res = this.getFriendPlayData(userId);
    let del = this.delFriend(userId);
    Log.i(this.getStringJSON(del))
    return this.sortByPTT(res.map(x => this.getBeautify(x))).map(x => x[0].join('\n')).join('\n----------\n');
  },
  getPTTByScore: function (constant, score) { 
    if (score >= 10000000) return constant + 2; 
    else if (score >= 9800000) return constant + 1 + (score - 9800000) / 200000; 
    else return Math.max(constant + (score - 9500000) / 300000, 0);
  },
  sortByPTT: function(list) {
    return list.sort((a, b) => b[1] - a[1]);
  }
};

let arc = new ArcApi();
arc.login('id', 'password');

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
  try {
    replier.reply('loading...');
    let res = arc.getDataByCode(msg);
    replier.reply(res);  
  }
  catch(e) {
    replier.reply(e + '\nLine#' + e.lineNumber);
  }
}