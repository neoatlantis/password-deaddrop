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



Details
-------

At client side, before storage request, a message M_C is given by user.
Optionally, the user may set a challenge with indication in C_C, and its answer
C_C_Secret.

The client generates SECRET, and 4 keys:
    1. K_CE = Hash(SECRET || "challenge encryption")
    2. K_CP = Hash(K_CE)
    3. K_ME, message encryption key. Calculated as
        K_ME = Hash(SECRET || "message encryption" || C_C_Secret)
    4. K_MP = Hash(K_ME)
Client sends server (C_S, M_S), as calculated by
    C_S = Encrypt(K_CP, Encrypt(K_CE, C_C))
    M_S = Encrypt(K_MP, Encrypt(K_CP, M_C))
and gets upon successful storage a Message ID. This message ID and SECRET
is present to user.


To retrieve the message, the client first retrieves the message metadata via
message ID. This is done at first access when the receiving user opens a URL
in browser. The client is informed on the presence of a challenge.

The user then enters SECRET. Client script request challenge C_C by sending
message id and K_CP (derived together with K_CE). Server tries decryption of
challenge C_S with K_CP, and if successful, C_C is returned and message
lifetime is shortened.

Client sends another request on message after user answered challenge by giving
out C_C_Secret, upon which K_ME and K_MP can be calculated. Similarly to
K_CP, server attempts decryption of M_S at first and returns M_C.

