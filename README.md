# The World Exchange

Very simple, "vanilla" 100% HTML client-side-only site demonstrating much of Ripple/XRP's capabilities through their API, including but not limited to:
- Trading of symbols (buy/sell)
- Issuing new symbols, including Ripple's KYC features like allowing only authorized token holders.
- Sending/receiving symbols
- Bid/ask orderbooks for any symbol with auto-bridging implemented to connect all XRP-traded symbols.
- Fully client-side implementation for all the benefits of a "cold wallet" (no storing or passing of information on remote servers), including the ability to both generate and verify valid wallets/addresses completely offline by saving the webpage to your desktop.

This project/site is nothing more than a single HTML page calling already existing functionality on Ripple's blockchain network.  No additional feature or functionality is added by this site.  It is analogous to the client-side HTML page for Ethereum called MyEtherWallet, except the underlying blockchain here has built-in exchange issuance, trading, and compliance functionality.  Similarly, if you are concerned about security, you should download the page itself and save it rather than go online each time (in case your browser gets intercepted, the domain name gets hijacked/mistyped, etc).

This project can be downloaded via Github's "Download as Zip" to use.  To launch the page, just open the index.html file in any browser with javascript enabled.  

Previously, there was a chatbox feature added, but it has been removed due to it adding potential security risk from allowing input from other users on the page and overall deviating from the "vanilla" wallet objective of this project by adding something so extraneous.  For those still interested to see how it might work on blockchain, it can be enabled by setting the var chatEnabled line to true in the JS file (after you download your own copy).

The page should serve as a helpful working example for much of Ripple's API functionality, which has been around since 2014 but lacks the tools and UIs of other blockchain ecosystems, as well as a proof-of-concept for what blockchain would look like in real-world use.

If there are any questions, feel free to ask or reach out at contact@theworldexchange.net
