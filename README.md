# The World Exchange

Very simple, "vanilla" 100% HTML client-side-only site demonstrating much of Ripple/XRP's capabilities through their API, including but not limited to:
- Trading of symbols (buy/sell)
- Issuing new symbols, including Ripple's KYC features like allowing only authorized token holders.
- Sending/receiving symbols
- Bid/ask orderbooks for any symbol with autobridging implemented to connect all XRP-traded symbols.
- Fully client-side implementation for all the benefits of a "cold wallet" (no storing or passing of information on remote servers), including the ability to both generate and verify valid wallets/addresses completely offline by saving the webpage to your desktop.
- Bonus: Chat box feature running entirely on Ripple, decentralized and stored forever, doubles as a free notary because nothing can ever be changed or removed once it's up.
- Bonus 2: Ripple Names is back and re-implemented entirely on the ledger.

This project/site is nothing more than a single HTML page calling already existing functionality on Ripple's blockchain network.  No additional feature or functionality is added by this site.  It is analogous to the client-side HTML page for Ethereum called MyEtherWallet, except the underlying blockchain here has built-in exchange issuance, trading, and compliance functionality.  As a precaution, we are no longer hosting the site online until there is more clarity from the SEC on what constitutes operating an exchange vs just providing a proof-of-concept interface to existing blockchain functionality (which is what this project is actually doing - analogous to a 3rd party mobile app or trading tool connecting to existing stock brokers/exchanges but not actually being an exchange itself nor processing any transactions).

This project can be downloaded via Github's "Download as Zip" to use, customize, or incorporate into your own Ripple-related projects; to launch the page, just open the index.html file in any browser with javascript enabled.

We welcome others to improve on the code, share, and use as they see fit.  The site already is and always has been open-source by the fact that it's just pure HTML/Javascript, which anyone can right-click the page while viewing and see the source on.  At the very least, it should serve as a helpful working example for much of Ripple's API functionality, which has been around since 2014 but lacks the tools and UIs of other blockchain ecosystems.

If there are any questions, feel free to ask or reach out at contact@theworldexchange.net
