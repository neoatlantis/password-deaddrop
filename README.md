Password Deaddrop
=================

Inspired by [temporary.pw](https://temporary.pw), this is a single-server
version.

This service generates a random password each time upon visit.  The password
can be used for your own purposes.  You can share the password with friends via
a link.

The link is valid for exactly once. If your friends can get the password via
link, then they get it, and no one else would do after that. If not, then
the password is leaked, but you can always try with your friends again.

## Design

All passwords are stored in memory at server.

When fetching a new password, a new password entry with expiring time records
is created in memory.

When retrieving an existing password, the password entry is deleted at server
immediately.  To display the password, the server does not return the password
in plaintext, but utilizes a CAPTCHA library to draw that on a SVG image. The
image data is further encrypted with an ephemeral public key supplied by
client. It's therefore not likely that the password image can be found from
client cache, and even if network traffic is recorded, it's not easy to
re-decrypt the image, since this ephemeral secret key at client side is used
only once and already deleted.

Notice that even with some cryptographic design, you MUST serve the whole
server via HTTPS, in order to prevent any Javascript being manipulated.

This is also not an end-to-end encryption. The password in plaintext resides
at server memory. Although difficult, it's not impossible to fetch these
passwords. Therefore you shall not use this service for any life-or-death
situation.
