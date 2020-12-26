const config = require("./config.js");

var ratelimit = config.ratelimit;
/* Reset rate limit */
setInterval(function(){
    ratelimit = config.ratelimit;
}, 10000);

module.exports = function(req, res, next){
    ratelimit -= 1;
    if(ratelimit <= 0){
        return res
            .status(503)
            .send("Service temporary unavailable. Please wait a while.");
    }
    next();
}
