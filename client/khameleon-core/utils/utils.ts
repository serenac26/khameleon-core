import * as _ from "underscore";
import { EventType } from "./syslogger";

export function get_filename(data) {
  // instead od stringify it, remove qutation marks because it is hard to deal with files like that
  var keys = _.keys(data);
  keys.sort();
  var pairs = keys.map(function (k) {
      let datum = k + "=" + data[k];
      return [ datum ];
  });


  pairs.push([`timestamp=${Date.now()}`]);
  return  pairs.join("&");
}


export function post(url: string, str: string, cb?) {
    return $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: url,
        data: str,
        success: function (data) {
            if (cb) cb(data);
            return data;
        },
        error: function (error) {
            console.log("error @", url, "->", error);
            window.running = false;
            return error;
        },
        //dataType: "json"
    })
}

export function post_stringify(url: string, json: {}, cb?) {
    if (url ==="/log/bandwidth" && window.gsyslogger && window.session_config.logNetwork)
        window.gsyslogger.addEvent(EventType.Network, json);
    
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: url,
        data: JSON.stringify(json),
        success: function (data) {
            if (cb) cb(data);
        },
        error: function (error) {
            console.log("error @", url, "->", error);
            window.running = false;
        },
        //dataType: "json"
    });
}

export function getUrlVars() {
    let vars = {};
    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, (m, key, value) => {
        const floatVal = parseFloat(value);
        if (!isNaN(floatVal)) {
            vars[key] = floatVal;
        } else {
            vars[key] = value;
        }
        return m;
    });
    return vars;
}

export function queryToKey(q) {
  var keys = _.keys(q);
  keys.sort();
  var pairs = keys.map(function(k) {
    return [k, q[k]];
  });
  return pairs;
}

// convert Map to Json object
//
export function mapToObj(strMap: Map<any, any>) {
  let obj = Object.create(null);
  for (let [k,v] of strMap) {
    // We don’t escape the key '__proto__'
    // which can cause problems on older engines
    obj[k] = v;
  }
  return obj;
}
  

export function inArray(arr, el) {
  return arr.indexOf(el) > -1;
}
