module.exports = {
    "password-life": (86400) * 1000, // in milliseconds
    "ratelimit": 100,        // how many requests per 10 seconds
//    "password-life": 15 * 1000, // in milliseconds

    "memcached": "127.0.0.1:11211",

    "limit-length": 512,
    "message-life-long": 86400,
    "message-life-short": 300,
}
