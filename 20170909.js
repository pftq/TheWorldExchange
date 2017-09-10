/*
  All code below developed by pftq and distributed by Autodidactic I (www.autodidactic.ai).
  Do not copy or re-distribute without permission.
  © 2016 The World Exchange | contact@theworldexchange.net
  
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// Servers added to the list are selected from at random to distribute load across the network
var servers = [
  'wss://s1.ripple.com/',
  'wss://s2.ripple.com/',
  'wss://s-east.ripple.com/',
  'wss://s-west.ripple.com/'
];

// Configurables
var dataAPI = "https://data.ripple.com";
var chatServer = "wss://s2.ripple.com/"; // server for pulling transaction history containing chat messages
var chatWallet = "rfaSyhoQmHQaFv8qNoWaALNPQf7pa7sm7Q"; // wallet used for storing chatroom messages, will just receive tons of failed sends
var namesServer = "wss://s2.ripple.com/"; // server for pulling transaction history containing chat messages
var namesWallet = "rpKi47qegs2uCrBJnvRay49KSBd8w569oK"; // wallet used for storing chatroom messages, will just receive tons of failed sends
var transactionServer = "wss://s2.ripple.com/"; // server for pulling transaction history of current account

var accuracy = 8;
var updateInterval = 2; // seconds
var chatUpdateInterval = 5; // seconds
var reconnectInterval = 600; // number of intervals before reconnecting to reset connection, reduces stale connections etc
var maxLedgerOffset = 100; // High number of maxLedger errors during heavy trading periods if we leave it at default
var maxFee = "2000"; // Would rather overpay than not see my order go through during heavy trading

var accountHistoryURL = "https://bithomp.com/explorer/"; // Site to use for account history
var transactionHistoryURL = "https://charts.ripple.com/#/transactions/"; // Site to use for transaction history

// Default Issuers to use; need to figure out how to match defaults on xrpcharts
var majorIssuers = {
    "BTC": ["rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"],
    "EUR": ["rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq"],
    "USD": ["rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B", "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq"]
};

// Known issuers; doesn't matter what you put here, updates dynamically via Ripple Data API
var issuers = {
    "BTC": ["rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"],
    "CNY": ["rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y"],
    "ETH": ["rcA8X3TVMST1n3CJeAdGk1RdRCHii7N2h"],
    "EUR": ["rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq"],
    "GBP": ["rBycsjqxD8RVZP5zrrndiVtJwht7Z457A8"],
    "JPY": ["r9ZFPSb1TFdnJwbTMYHvVwFK1bQPUCVNfJ"],
    "KRW": ["rPxU6acYni7FcXzPCMeaPSwKcuS2GTtNVN"],
    "USD": ["rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B", "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq"],
    "XAG": ["r9Dr5xwkeLegBeXq6ujinjSBLQzQ1zQGjH"],
    "XAU": ["r9Dr5xwkeLegBeXq6ujinjSBLQzQ1zQGjH"],
    "XRP": []
};

// Known issuer names; doesn't matter what you put here, updates dynamically via Ripple Data API
var issuerNames = {
    "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B":"Bitstamp",
    "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq":"Gatehub",
    "rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y":"Ripplefox",
    "rcA8X3TVMST1n3CJeAdGk1RdRCHii7N2h":"Gatehub Fifth",
    "rBycsjqxD8RVZP5zrrndiVtJwht7Z457A8":"Ripula",
    "r9ZFPSb1TFdnJwbTMYHvVwFK1bQPUCVNfJ":"Ripple Exch Tokyo",
    "rPxU6acYni7FcXzPCMeaPSwKcuS2GTtNVN":"EXRP",
    "r9Dr5xwkeLegBeXq6ujinjSBLQzQ1zQGjH":"Ripple Singapore",
    "rDVdJ62foD1sn7ZpxtXyptdkBSyhsQGviT":"Ripple Dividend"
};

// Current state variables
var api; 
var chatAPI;
var namesAPI;
var address = '';
var key = '';
var baseReserve = 20;
var baseIncrement = 5;
var baseFee = 5;
var baseCurrency = "XRP";
var baseToDollar = 0.2;
var minBaseCurrency = 40;
var fee = 0.012;
var symbol1="";
var symbol2="";
var issuer1=""; 
var issuer2="";
var bookdepth = 8;
var mktcapName1="";
var mktcapName2="";
var mktcap1=0;
var mktcap2=0;
var action = "";
var lastIssuer1 = "";
var lastSymbol1 = "";
var lastIssuer2 = "";
var lastSymbol2 = "";
var destTag = "";
var memo = "";
var showChat = false;
var lastChat = "";
var displayName = {}; // address: displayName
var displayNameDetails = {}; // displayName: {date:<date>, address: address}
//var failedLogin = "";

// For low-level stuff only, do not mess with
var numIntervals = -1;
var noDisconnecting = false;
var reconnecting = false;
var showOrderbook = false;
var errored = false;
var loggingIn = false;
var refreshImmediately = false;
var chatLoaded = false;
var disableScrollToAbout = false; // for when scrolling shouldn't open the about page
var scrolling = false;
var currentChatUpdateInterval = 1; // for speeding up after you've sent a message before increasing back to normal

var trustlines = {
  
};

// state variable for current account flags
var settings = {
    "defaultRipple":false,
    "disableMasterKey":false,
    "disallowIncomingXRP":false,
    "enableTransactionIDTracking":false,
    "globalFreeze":false,
    "noFreeze":false,
    "passwordSpent":false,
    "regularKey":null,
    "requireAuthorization":false,
    "requireDestinationTag":false,
    "rippleServer":null
};

// default settings for each flag
var defaultSettings = {
    "defaultRipple":false,
    "disableMasterKey":false,
    "disallowIncomingXRP":false,
    "enableTransactionIDTracking":false,
    "globalFreeze":false,
    "noFreeze":false,
    "passwordSpent":false,
    "regularKey":null,
    "requireAuthorization":false,
    "requireDestinationTag":false,
    "rippleServer":null
};

// Added settings not part of RippleAPI, such as what server to connect to
var addedSettings = [
  "rippleServer"
];

// string: description for account flags that are strings
var stringSettings = {
  "regularKey": "Account to use secret key of.",
  "rippleServer": "Server to connect to Ripple."
};

var holdings = {
    "XRP":0
};

// Select a server at random to distribute load across the network
function selectServer(selectedServer) {
  if(selectedServer===undefined || selectedServer=='undefined' || selectedServer=="") {
    settings["rippleServer"] = servers[Math.floor(Math.random()*servers.length)];
  }
  else settings["rippleServer"] = selectedServer;
  console.log("Server selected: "+settings["rippleServer"]);
  api = new ripple.RippleAPI({server:settings["rippleServer"]});
}

// Format long numbers to 100K, 10M, etc
function nFormatter(num, digits) {
  try {
    var si = [
      { value: 1E18, symbol: "E" },
      { value: 1E15, symbol: "P" },
      { value: 1E12, symbol: "T" },
      { value: 1E9,  symbol: "B" },
      { value: 1E6,  symbol: "M" },
      //{ value: 1E3,  symbol: "k" }
    ], rx = /\.0+$|(\.[0-9]*[1-9])0+$/, i;
    for (i = 0; i < si.length; i++) {
      if (num >= si[i].value) {
        return (num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol;
      }
    }
    return num.toFixed(digits).replace(rx, "$1");
  }
  catch (err) { return num; }
  return num;
}

// For cleaning HTML from strings, especially chat messages
function stripHTML(dirtyString) {
  var container = document.createElement('div');
  var text = document.createTextNode($($.parseHTML(dirtyString)).text());
  container.appendChild(text);
  return container.innerHTML; // innerHTML will be a xss safe string
}

// Replace welcome message with login state or vice versa
function updateLoginMessage() {
  if(address!="" && $("#yourAccount").css("display")!="block") {
    $("#welcome").css("display", "none");
    $("#yourAccount").css("display", "block");
    $("#chatSettings").css("display", "block");
    refreshChatLayout();
  }
  else if(address=="" && $("#yourAccount").css("display")!="none") {
    $("#welcome").css("display", "block");
    $("#yourAccount").css("display", "none");
    $("#chatSettings").css("display", "none");
    refreshChatLayout();
  }
}

// Refresh account stats such as balances, orders, etc
function loadAccount(loadOrderbookNext) {
  if(loadOrderbookNext===undefined || loadOrderbookNext=='undefined') loadOrderbookNext=false;

  var baseCurrencyCount = 0;

  var changeMiscMenu = false;

  new Promise(function(resolve, reject) { 
    var temp = $("#account").val();
    
    // Save the account address to cookie (do not touch secret keys)
    if(temp!=address) {
      address = $("#account").val();
      Cookies.set('accountAddr', address, { expires: 7 });
      console.log("Account address saved to cookie: "+address);
      updateSymbol1();
      changeMiscMenu = true;
    }
    updateLoginMessage();
    
    // Reconnect if disconnected and not already reconnecting
    if(!reconnecting) {
      reconnecting = true;
      try {
        if(api.isConnected()) {
          reconnecting = false;
          resolve();
        }
        else {
          console.log('Disconnected in loadAccount.');
          try {
            selectServer();
            api.connect().then(function() {
                console.log("Reconnected in loadAccount.");
                reconnecting = false;
                resolve();
            }, function (err) {
              console.log("Failed to reconnect in loadAccount: "+err);
              reconnecting = false;
              resolve();
            });
          }
          catch (er) {
            console.log("Failed to reconnect in loadAccount: "+er);
            reconnecting = false;
            resolve();
          }
        }
      }
      catch (erx) {
        console.log("Error in loadAccount API: "+erx);
        reconnecting = false;
        resolve();
      }
    }
    else setTimeout(resolve, 5000); // Pause a bit to wait for other reconnecting effort
    
    }, function (err) {
      console.log("Error in loadAccount: "+err);
    }).then(function() { 
    
      if(address=="" || !api.isConnected()) {
        if(minBaseCurrency!=0) changeMiscMenu = true;
        minBaseCurrency = 0;
        return "";
      }
      else {
        // Pull basic info on the account first
        var info = "";
        try {
          info = api.getAccountInfo(address); 
        }
        catch (err) {
          console.log("Error getAccountInfo: "+err);
        }
        return info;
      }
      
    }, function(err) { console.log("Error getAccountInfo: "+err); return ""; }).then(function(info) {
      
      if(info) {
        // Save minXRP and current XRP balance
        var minReserve = baseReserve + baseIncrement*info.ownerCount;
        if(minReserve!=minBaseCurrency) {
          minBaseCurrency = minReserve;
          changeMiscMenu = true;
        }
        baseCurrencyCount = parseFloat(info.xrpBalance);
        //console.log(info);
        
        // Download current fee
        return api.getFee();
        
      } else return null;
      
    }, function(err) { 
        
        console.log("Error loading minBaseCurrency: "+err);
        
        if(err=="[RippledError(actNotFound)]") {
          if(minBaseCurrency!=baseReserve) changeMiscMenu = true;
          minBaseCurrency = baseReserve;
          baseCurrencyCount = 0;
        }
    
    }).then(function(currentFee) {
      if(currentFee!=null) {
        try { // Update the fee
          var newFee = parseFloat(currentFee);
          if(newFee!=fee) {
            changeMiscMenu = true;
            fee = newFee;
            $("#feeAnnouncement").html((fee+0.000001).toFixed(6));
            $("#feeDollar").html(((fee+0.000001)*baseToDollar).toFixed(6));
          }
        }
        catch(ex) { console.log("Error parsing fee: "+err); }
      }
    }, function(err) {
      console.log("Error loading fee: "+err);
    }).then(function() { 
      if(address=="" || !api.isConnected()) return "";
      else {
      
        // Pull current balances.  Use getBalanceSheet instead of getBalances because it's faster and aggregates duplicates together
        var sheet = "";
        try {
          //console.log("Fetching balances...");
          sheet = api.getBalanceSheet(address);
        }
        catch (err) {
          console.log("Error getBalanceSheet: "+err);
        }
        return sheet;
        
      }
    }, function(err) { console.log("Error getBalances: "+err); return ""; }).then(function(sheet) {
        var balanceOutput = "";
        //console.log("Finished getting balances:");
        //console.log(sheet);
        
        // Parse balanceSheet object to extract holdings as positive and obligations (issuances) as negatives
        if(address!="" && sheet!=null && sheet!="" && ((sheet.assets!=null && sheet.assets.length>0) || (sheet.obligations!=null && sheet.obligations.length>0))) {
          
          //console.log("Building holdings from getBalanceSheet...");
          
          // Reset holdings to empty and rebuild
          holdings = {};
          holdings[baseCurrency]=baseCurrencyCount;
          
          var updateIssuers = false;
          
          // Holdings as positive
          if(sheet.assets) {
            var balances = sheet.assets;
            for(var i=0; i<balances.length; i++) {
              if(balances[i].value==0) continue;
              if(balanceOutput!="") balanceOutput+=", ";
              var counterparty = ""+balances[i].counterparty;
              if(balances[i].value<0) counterparty = address;
              var s = balances[i].currency + (counterparty!="undefined" && (!(balances[i].currency in issuers) || (issuers[balances[i].currency].length>0))? "."+counterparty:"");
              
              if(!(s in holdings)) holdings[s] = 0;
              
              holdings[s] += parseFloat(balances[i].value);
              
            }
          }
          
          // Obligations (issuances) as negatives
          if(sheet.obligations) {
            var balances = sheet.obligations;
            for(var i=0; i<balances.length; i++) {
              if(balances[i].value==0) continue;
              if(balanceOutput!="") balanceOutput+=", ";
              var counterparty = address;
              var s = balances[i].currency + "."+counterparty;
              
              if(!(s in holdings)) holdings[s] = 0;
              
              holdings[s] -= parseFloat(balances[i].value);
            }
          }
        }
        else {
            // Otherwise just update the XRP pulled from accountInfo
            // We don't want to reset holdings to empty because sometimes getBalances just temporarily times out
            //console.log("Only have XRP.  Updating holdings = "+baseCurrencyCount);
            holdings[baseCurrency]=baseCurrencyCount;
        }
        
        // Create display of balances
        var sortedHoldings = Object.keys(holdings).sort(function(a,b){return holdings[a]-holdings[b]});
        for(var i = 0; i<sortedHoldings.length; i++) {
          var s = sortedHoldings[i];
          
          if(holdings[s] == 0) continue;
          
          var act = holdings[s]>0? "sell":"buy";
          var qty = Math.abs(holdings[s]);
          
          var ss = s.split('.');
          var currency = ss[0];
          var counterparty = (ss.length>1? ss[1]:"");
          
          balanceOutput+="<a target='_blank' href='?qty1="+qty+"&amp;symbol1="+s+"' onclick='loadURLSymbol(\"\", "+qty+", \""+s+"\"); return false;'>"+parseFloat(holdings[s].toFixed(holdings[s]>1? 2:4)).toString()+" "+currency+"</a> "; // Make sure to include space at the end to avoid page overflow
          
          // Check if issuer exists in autocomplete and add if it doesn't
          if(!(currency in issuers)) {
            issuers[currency] = [];
            updateIssuers = true;
          }
          if(counterparty!="" && counterparty!="undefined" && issuers[currency].indexOf(counterparty)<0) {
            issuers[currency].push(counterparty);
            updateIssuers = true;
          }
        }
        
        // Update autocomplete of issuers if needed
        if(updateIssuers) {
          var symbolsList = symbolLister();
          $("#symbol1").autocomplete({ source:symbolsList});
          $("#symbol2").autocomplete({ source:symbolsList});
        }
        
        
        // Most likely new accounts not funded; should do nothing and let the fund your account message show (later below)
        if(address!="" && (Object.keys(holdings).length<1 || holdings[baseCurrency]<minBaseCurrency)) {
          //console.log("No results from getBalances.");
          //console.log(balances);
        }
        // Normal display of balances
        else if(balanceOutput!="") {
          $("#balanceLabel").css("visibility", "visible");
          $("#balanceLabel").css("display", "block");
          $("#balance").css("display", "block");
          $("#balance").html(""+balanceOutput);
        }
        // Hide balances box if nothing to show and no account
        else {
          $("#balanceLabel").css("visibility", "hidden");
          $("#balanceLabel").css("display", "none");
          $("#balance").css("display", "none");
          $("#balance").html("");
        }
        
    }, function(err) {
      console.log("Error building balances: "+err);
  }).then(function() { 
  
    if(address=="" || !api.isConnected() || holdings[baseCurrency]==0) return "";
    else {
    
      // Look up outstanding trade orders but only if account is activated
      var orders = "";
      try {
        orders = api.getOrders(address);
      }
      catch(err) {
        console.log("Error api.getOrders: "+err); 
      }
      return orders;
    }
      
  }, function(err) {console.log("Error getOrders: "+err); return ""; }).then(function(orders) {
    
    // Display orders to page
    var ordersOutput = "";
    if(address!="" && orders!="") {
      var updateIssuers = false;
      for(var i=0; i<orders.length; i++) {
        if(ordersOutput!="") ordersOutput+="<br /> ";
        var direction = orders[i].specification.direction;
        var counterparty1 = ""+orders[i].specification.quantity.counterparty;
        if(counterparty1==address) direction = "issue";
        var counterparty2 = ""+orders[i].specification.totalPrice.counterparty;
        var qty = parseFloat(orders[i].specification.quantity.value);
        var symbol1 = ""+orders[i].specification.quantity.currency;
        var symbol2 = ""+orders[i].specification.totalPrice.currency;
        var price = parseFloat(orders[i].specification.totalPrice.value)/parseFloat(orders[i].specification.quantity.value);
        var s1 = symbol1 + (counterparty1!="" && counterparty1!="undefined" && (!(symbol1 in issuers) || (issuers[symbol1].length>0))? "."+counterparty1:"");
        var s2 = symbol2 + (counterparty2!="" && counterparty2!="undefined" && (!(symbol2 in issuers) || (issuers[symbol2].length>0))? "."+counterparty2:"");
        var orderSeq = orders[i].properties.sequence;
        
        ordersOutput+="<span style='white-space:nowrap;'><a href='#' onclick='cancelOrder("+orderSeq+"); this.style.display = \"none\"'>[X]</a> <a target='_blank' href='?action="+direction+"&amp;qty1="+qty+"&amp;symbol1="+s1+"&amp;price="+price+"&amp;symbol2="+s2+"' onclick='loadURLSymbols(\""+direction+"\", "+qty+", \""+s1+"\", "+price+", \""+s2+"\"); return false;'>"+direction+" "+parseFloat(qty.toFixed(qty>1? 2:4)).toString()+" "+symbol1+" @ "+parseFloat(price.toFixed(price>1? 2:4)).toString()+" "+symbol2+"</a></span> "; // Make sure to include space at the end to avoid page overflow
        
        // Check if issuer exists in autocomplete and add if it doesn't
        if(!(symbol1 in issuers)) {
          issuers[symbol1] = [];
          updateIssuers = true;
        }
        if(counterparty1!="" && counterparty1!="undefined" && issuers[symbol1].indexOf(counterparty1)<0) {
          issuers[symbol1].push(counterparty1);
          updateIssuers = true;
        }
        if(!(symbol2 in issuers)) {
          issuers[symbol2] = [];
          updateIssuers = true;
        }
        if(counterparty2!="" && counterparty2!="undefined" && issuers[symbol2].indexOf(counterparty2)<0) {
          issuers[symbol2].push(counterparty2);
          updateIssuers = true;
        }
          
      }
      
      // Update autocomplete for issuers if needed
      if(updateIssuers) {
        var symbolsList = symbolLister();
        $("#symbol1").autocomplete({ source:symbolsList});
        $("#symbol2").autocomplete({ source:symbolsList});
      }
    }
    
    // Display orders if they exist, otherwise hide the box
    if(ordersOutput!="") {
      $("#ordersLabel").css("visibility", "visible");
      $("#ordersLabel").css("display", "block");
      $("#orders").css("display", "block");
      $("#orders").css("visibility", "visible");
      $("#orders").html(""+ordersOutput);
    }
    else {
      $("#ordersLabel").css("visibility", "hidden");
      $("#ordersLabel").css("display", "none");
      $("#orders").css("display", "none");
      $("#orders").css("visibility", "hidden");
      $("#orders").html("");
    }
    
  }, function(er) { console.log("Error building orders: "+er); }).then(function() {
  
    // Show account information only if logged in
    var tag = "div";
    if(address=="") tag="span";
    var commonMenu = "<"+tag+" id='tutorialsHeader'><a href='https://www.youtube.com/playlist?list=PLHAK7FXoElZOyM6MaQ_O_i6ATap2k9r-o' target='_blank'>Video Tutorials</a></div>"+(address==""? " &nbsp; ":"")+"<"+tag+" id='chatHide' "+(showChat? "":"style='display:none;'")+"><a href='#' onclick='hideChatbox(); "+(isMobile()? "hideMiscMenu();":"")+"'>Hide Chat</a></"+tag+"><"+tag+" id='chatShow' "+(!showChat? "":"style='display:none;'")+"><a href='#' onclick='showChatbox(); "+(isMobile()? "hideMiscMenu();":"")+"'>Show Chat</a></"+tag+">";
    if($.trim($("#miscMenu").html())=="") {
      changeMiscMenu = true;
    }
    if(address!="") {
      if(changeMiscMenu) {
        $("#miscMenu").html("<div><a href='#started' onclick='$(\"#about\").css(\"display\", \"block\"); jQuery(\"html,body\").animate({scrollTop: jQuery(\"#started\").offset().top}, 1000); setURL(\"#started\"); "+(isMobile()? "hideMiscMenu();":"")+" return false;'>Min "+baseCurrency+": "+nFormatter(minBaseCurrency, accuracy)+"</a> | <a href='#started' onclick='$(\"#about\").css(\"display\", \"block\"); jQuery(\"html,body\").animate({scrollTop: jQuery(\"#started\").offset().top}, 1000); setURL(\"#started\"); "+(isMobile()? "hideMiscMenu();":"")+" return false;'>Current Fee: "+fee.toFixed(6)+"</a><br /><a href='"+accountHistoryURL+""+address+"' onclick='"+(isMobile()? "hideMiscMenu();":"")+"' target='_blank'>View Account History</a></div><div><a href='#' onclick='showTrustlines(); "+(isMobile()? "hideMiscMenu();":"")+"'>Set "+(settings["requireAuthorization"]? "Authorized Token Holders":"Receivable Tokens")+"</a></div><!--<div><a href='#started' onclick='$(\"#about\").css(\"display\", \"block\"); jQuery(\"html,body\").animate({scrollTop: jQuery(\"#started\").offset().top}, 1000); setURL(\"#started\"); "+(isMobile()? "hideMiscMenu();":"")+" return false;'>How to Fund / Deposit</a></div>--><div><a href='#' onclick='showSettings();"+(isMobile()? "hideMiscMenu();":"")+"'>Advanced Settings</a></div>"+commonMenu);
        if($("#showMiscMenu").css("display") == 'none' && $("#hideMiscMenu").css("display") == 'none') {
          $("#showMiscMenu").css("display", "block");
          $("#hideMiscMenu").css("display", "none");
        }
        checkMinBaseCurrency(); // Update balance info to message to fund account
        refreshLayout();
      }
    }
    else {
      if(changeMiscMenu) {
        $("#miscMenu").html(commonMenu);
        $("#showMiscMenu").css("display", "none");
        $("#hideMiscMenu").css("display", "none");
        refreshLayout();
      }
    }
    
  }, function(er) { console.log("Error printing orders: "+er); }).then(function() {
    
    // Periodic disconnect to refresh the connection and avoid stale no-response state
    if(api.isConnected() && loadOrderbookNext && !noDisconnecting && !reconnecting) {
      if(numIntervals>=reconnectInterval) {
        numIntervals = 0;
        return api.disconnect();
      }
      else numIntervals++;
    }
    
  }, function(er) { console.log("Error disconnecting after loadAccount: "+er); }).then(function() {
  
    // Create back-and-forth loop with loadOrderbook function for constant refresh
    if(loadOrderbookNext) {
      interruptableTimer(loadOrderbook);
    }
    
  }, function(err) { 
      // Restart back-and-forth loop with loadOrderbook function if errored out
      console.log("Error completing account load: "+err);
      if(loadOrderbookNext) {
        interruptableTimer(loadOrderbook);
      } 
  });
}

// Custom setTimer function to allow wait-time to change while it's waiting
function interruptableTimer(functionToCall, waitedSoFar) {
  if(waitedSoFar===undefined || waitedSoFar=='undefined') waitedSoFar = 0;
  var waitThresh = getInterval();
  if(waitedSoFar<waitThresh) {
    //console.log("Waiting "+waitedSoFar+" / "+waitThresh);
    setTimeout(function() {interruptableTimer(functionToCall, waitedSoFar+100); }, 100);
  }
  else {
    //console.log("Calling function...");
    functionToCall();
  }
}

// Dynamic wait time of the interruptableTimer
// Set refreshImmediately to true anywhere in the code to end timer immediately
function getInterval() {
  if(refreshImmediately) {
    refreshImmediately = false;
    //console.log("Forcing refresh immediately...");
    return 1;
  }
  else return updateInterval*1000;
}

// Show/hide misc menu for mobile
function showMiscMenu() {
  if(address=="") return;
  document.getElementById("miscMenu").style.display="block"; 
  document.getElementById("showMiscMenu").style.display="none"; 
  document.getElementById("hideMiscMenu").style.display="block";  
  refreshImmediately = true; 
  rescaleWindow();
}
function hideMiscMenu() {
  if(address=="") return;
  document.getElementById("miscMenu").style.display="none"; 
  document.getElementById("showMiscMenu").style.display="block"; 
  document.getElementById("hideMiscMenu").style.display="none"; 
  refreshImmediately = true; 
  rescaleWindow();
}

// Close/open chat box
function showChatbox(updateMenu) {
  if(updateMenu===undefined || updateMenu=='undefined') updateMenu = true;
  showChat = true;
  currentChatUpdateInterval = 0;
  document.getElementById("chatbox").style.display="initial"; 
  if(isMobile()) $("#about").css("display", "none");
  if(document.getElementById("chatShow")!=null && updateMenu) { // not built until end of doc load
    document.getElementById("chatShow").style.display="none"; 
    document.getElementById("chatHide").style.display="initial"; 
    rescaleChat();
  }
}
function hideChatbox(updateMenu) {
  if(updateMenu===undefined || updateMenu=='undefined') updateMenu = true;
  showChat = false; 
  document.getElementById("chatbox").style.display="none"; 
  if(isMobile()) $("#about").css("display", "block");
  if(document.getElementById("chatShow")!=null && updateMenu) {//not built until end of doc load
    document.getElementById("chatShow").style.display="initial"; 
    document.getElementById("chatHide").style.display="none"; 
  }
}

// Check and display minXRP needed
function checkMinBaseCurrency() {
  //console.log("Checking min balance: "+holdings[baseCurrency]+" vs "+minBaseCurrency);
  if(holdings[baseCurrency]<minBaseCurrency) {
    $("#balanceLabel").css("display", "hidden");
    $("#balanceLabel").css("display", "block");
    $("#balance").css("display", "block");
    $("#balance").html("Your account needs <a href='#started' onclick='$(\"#about\").css(\"display\", \"block\"); jQuery(\"html,body\").animate({scrollTop: jQuery(\"#started\").offset().top}, 1000); setURL(\"#started\"); return false;'>&gt;= "+minBaseCurrency+" "+baseCurrency+"</a>."+(isMobile()? " (Currently: "+(holdings[baseCurrency])+")":"<br />You currently have: "+(holdings[baseCurrency])+".<br />See: <a href='#started' onclick='$(\"#about\").css(\"display\", \"block\"); jQuery(\"html,body\").animate({scrollTop: jQuery(\"#started\").offset().top}, 1000); setURL(\"#started\"); return false;'>How to Get Started</a>"));
  }
}

// Download account transaction history as a CSV
function accountHistoryCSVOld() {
  if(address=="") return;
  var csv = ['Date,Type,From,To,Amount,Currency,Issuer'];
  var url = dataAPI+"/v2/accounts/"+address+"/transactions?result=tesSUCCESS&limit=2";
  $.get( url, function( data ) {
      try {
        console.log(data);
        if(data!=null && data.transactions!=null) {
          for(var i=0; i<data.transactions.length; i++) {
            var amt = "";
            var symbol = "XRP";
            var issuer = "";
            if(typeof data.transactions[i].tx.Amount === 'object') {
              amt = data.transactions[i].tx.Amount.value;
              symbol = data.transactions[i].tx.Amount.currency;
              issuer = data.transactions[i].tx.Amount.issuer;
            }
            else amt = data.transactions[i].tx.Amount;
            csv.push([
              data.transactions[i].date.replace("T", " ").replace(".000Z", ""), 
              data.transactions[i].tx.TransactionType, 
              data.transactions[i].tx.Account,
              data.transactions[i].tx.Destination,
              amt,
              symbol,
              issuer
            ].join(","));
          }
          downloadCSV("Ripple-Transaction-History_"+address+".csv", csv.join("\r\n"));
        }
      }
      catch (err) { 
        errored = true;
        $("#errors").html("Error retrieving history: "+err);
      }
  }, "json" );
}
function accountHistoryCSV() {
  if(address=="") return;
  var csv = ['Date,Type,From-Address,From-Amount,From-Symbol,To-Address,To-Amount,To-Currency'];
  var transactionHistoryAPI = new ripple.RippleAPI({server:transactionServer});
  transactionHistoryAPI.connect().then(function() {
    var options = {earliestFirst:true, excludeFailures:true};
    return transactionHistoryAPI.getTransactions(address, options );
  }, function(err) { errored=true;$("#errors").html("Failed to connect for transaction history: "+err); return null;})
  .then(function (transactions) {
    
    if(transactions!=null) {
      
      for(var i = 0; i<transactions.length; i++) {
        try {
          csv.push([
          transactions[i].outcome.timestamp.replace("T", " ").replace(".000Z", ""), 
          transactions[i].type, 
          transactions[i].specification.source.address, 
          transactions[i].specification.source.maxAmount.value,
          transactions[i].specification.source.maxAmount.currency,
          transactions[i].specification.destination.address, 
          transactions[i].specification.destination.amount.value,
          transactions[i].specification.destination.amount.currency
          ].join(","));
          
        }
        catch(ex) {
          console.log("Transaction parsing error: "+ex);
        }
      }
    }
    else {
      errored=true;
      $("#errors").html("No transaction history. Try again a bit later.");
    }
  }, function(err) {
    if(err=="[MissingLedgerHistoryError(Server is missing ledger history in the specified range)]") {
      errored=true;
      $("#errors").html("No transaction history retrieved. Try again a bit later.");
    }
    else {
      errored=true;
      $("#errors").html("Transaction retrieval error: "+err);
    }
  }).then(function() {
    return transactionHistoryAPI.disconnect();
  }).then(function() {
    downloadCSV("Ripple-Transaction-History_"+address+".csv", csv.join("\r\n"));
  });
}

// Generic CSV download
function downloadCSV(filename, content) {
  var a = document.createElement('a');
  var mimeType = 'application/csv';
  var charset='utf-8';

  if (navigator.msSaveBlob) 
  {
    return navigator.msSaveBlob(new Blob([content], { type: mimeType }), filename);
  } 
  else if ('download' in a) 
  {
    a.href = 'data:' + mimeType+';charset='+charset + ',' + encodeURIComponent(content);
    a.setAttribute('download', filename);
    document.body.appendChild(a);							
    a.click();
    document.body.removeChild(a);
    return true;
  } 
  else 
  {
    var f = document.createElement('iframe');
    document.body.appendChild(f);
    f.src = 'data:' + mimeType+';charset='+charset + ',' + encodeURIComponent(content);
    document.body.removeChild(f);
    return true;
  }
}

// Create list of symbols for autocomplete
function symbolLister() {
  var result = [];
  for(var symbol in issuers)
    if($.inArray(symbol, result) === -1) result.push(symbol);
  result.sort();
  return result;
}

// Build pair for orderbook lookup
function getPair(s1, i1, s2, i2) {
  var pair = {};
  pair.base = {};
  pair.counter = {};
  pair.base.currency = s1;
  pair.counter.currency = s2;
  
  if(i1!="" && s1!=baseCurrency && (!(s1 in issuers) || issuers[s1].length>0)) pair.base.counterparty=i1;
  if(i2!="" && s2!=baseCurrency && (!(s2 in issuers) || issuers[s2].length>0)) pair.counter.counterparty=i2;
  
  //console.log(pair.base.currency+"."+pair.base.counterparty+" vs "+pair.counter.currency+"."+pair.counter.counterparty);
  
  return pair;
}

// Get current selected text on page
function getSelectedText() {
    var text = "";
    if (typeof window.getSelection != "undefined") {
        text = window.getSelection().toString();
    } else if (typeof document.selection != "undefined" && document.selection.type == "Text") {
        text = document.selection.createRange().text;
    }
    return text;
}

// Load and refresh orderbook; back-and-forth loop with loadAccount
// updateMessageOnly used by updateAction to only update page description quickly and skip orderbook lookup
// set repeat option to false to avoid multiple orderbook refresh loops
function loadOrderbook(updateMessageOnly, repeat) {
  if(updateMessageOnly===undefined || updateMessageOnly=='undefined') updateMessageOnly = false;
  if(repeat===undefined || repeat=='undefined') repeat = true;
  if(action=='send') updateMessageOnly = true;
  try {
  //console.log("orderbook-entry: "+showOrderbook+", symbol1="+symbol1+", symbol2="+symbol2);
  var currentOrderbook = null;
  var bridgedBook1 = null;
  var bridgedBook2 = null;
  var orderbookExists = true;
  new Promise(function(resolve, reject) {
  
    // Check if disconnected first and reconnect if so
    if(!updateMessageOnly) {
      if(!reconnecting) { // Make sure we're not already reconnecting asynchronously
        reconnecting = true;
        try {
          if(api.isConnected()) {
            reconnecting = false;
            resolve();
          }
          else {
            console.log('Disconnected in loadOrderbook.');
            try {
              selectServer();
              api.connect().then(function() {
                  console.log("Reconnected in loadOrderbook.");
                  reconnecting = false;
                  resolve();
              }, function (err) {
                console.log("Failed to reconnect in loadOrderbook: "+err);
                reconnecting = false;
                resolve();
              });
            }
            catch (er) {
              console.log("Failed to reconnect in loadOrderbook: "+er);
              reconnecting = false;
              resolve();
            }
          }
        }
        catch (erx) {
          console.log("Error in loadOrderbook API: "+erx);
          reconnecting = false;
          resolve();
        }
      }
      else setTimeout(resolve, 5000); // Wait a bit if asynchronously reconnecting already
    }
    else {
      resolve();
    }
    
  }, function (err) {
  
      // Restart orderbook refresh loop if errored out
      console.log("Error in loadOrderbook: "+err);
      console.log("Restarting refresh cycle...");
      if(repeat && !updateMessageOnly) 
        interruptableTimer(loadOrderbook);
        
  }).then(function() {
    // Make sure symbols and marketcaps are accurate before doing expensive orderbook lookup
    if(!updateMessageOnly && showOrderbook && getSelectedText()=="") {
      updateSymbols();
      updateMarketCaps();
    }
  }, function(err) { console.log("Error updating tokens before orderbook: "+err); }).then(function() { 
  
    // Only do orderbook lookup if function is not called to only update the page description
    // Don't update while we're typing (getSelectedText=="")
    if(!updateMessageOnly && api.isConnected() && showOrderbook && getSelectedText()=="") {
      try {
        refreshLayout();
        
        // Limit request to how many we can display on the page
        bookdepth = Math.max(1, Math.round((($('#container').outerHeight()- $("#orderbook").offset().top - $("footer").outerHeight())-100)/($('#footer').outerHeight()/1.5)));
        
        // Older bug (and still exists in ripplelib!) where any modern Apple device froze because of Javascript outdated libraries in ripplelib
        // Ripple still hasn't fixed this but we're using a modified version of it that has libraries updated
        //if( /iPhone/i.test(navigator.userAgent) ) return null; // broken on iphone, freezes
        
        //console.log("Requesting orderbook: "+symbol1+"."+issuer1+" x "+symbol2+"."+issuer2);
        
        return api.getOrderbook(address=="" || address.length<=10?  Object.keys(issuerNames)[0]:address, getPair(symbol1, issuer1, symbol2, issuer2), {limit:bookdepth+5}); 
      }
      catch (ex) {
        console.log("Error requesting orderbook: "+ex);
        return null;
        //refreshLayout();
      }
    }
    else return null;
  }, function (err) {
      console.log("Error in api.loadOrderbook: "+err);
      return null;
  })
  .then(function(orderbook) {
    currentOrderbook = orderbook;
    
    if(!updateMessageOnly) {
      //console.log("Main orderbook: ");
      //console.log(orderbook);
    }
    
    // Check for autobridge-able orderbooks by 1 degree (through XRP pairs with each the left and right side)
    // Don't bother for XRP, assuming only non-XRP tickers are autobridged
    
    // work in progress, disabled until next vers
    // First bridged orderbook
    if(!updateMessageOnly
     && symbol1!=baseCurrency && symbol2 != baseCurrency) {
      //console.log("Requesting orderbook for bridging left: "+symbol1+"."+issuer1+" x "+baseCurrency);
      return api.getOrderbook(address=="" || address.length<=10?  Object.keys(issuerNames)[0]:address, getPair(symbol1, issuer1, baseCurrency, ""), {limit:bookdepth+5});
    }
    else return null;
  }, function (err) {
      console.log("Error in api.loadOrderbook for bridged quote 1: "+err);
      return null;
  }).then(function(orderbook1) {
  
  // Work in progress for autobridged orderbooks
  
      bridgedBook1 = orderbook1;
      
      //console.log("Left side of bridged book:");
      //console.log(orderbook1);
      
      // Second bridged orderbook
      if(bridgedBook1!=null) {
        //console.log("Requesting orderbook for bridging right: "+symbol2+"."+issuer2+" x "+baseCurrency);
        return api.getOrderbook(address=="" || address.length<=10?  Object.keys(issuerNames)[0]:address, getPair(symbol2, issuer2, baseCurrency, ""), {limit:bookdepth+5});
      }
      else {
        //console.log("No left side to bridge orderbooks.");
        return null;
      }
    }, function (err) {
      console.log("Error in api.loadOrderbook for bridged quote 2: "+err);
      return null;
  }).then(function(orderbook2) {
      bridgedBook2 = orderbook2;
      
      if(!updateMessageOnly) {
        //console.log("Right side of bridged book:");
        //console.log(orderbook2);
      }
      
      // Combine the books
      try {
        if(!updateMessageOnly && showOrderbook && bridgedBook1!=null && bridgedBook2!=null) {
          showOrderbook = true; // in case the main book has no orders and shut this off
          
          if(currentOrderbook==null) currentOrderbook = {bids:[], asks:[]};
          
          // mainbook = symbol1 for symbol2 - ex: BTC for USD
          // bridgedBook1 = symbol1 for XRP - ex: BTC for XRP
          // bridgedBook2 = symbol2 for XRP - ex: USD for XRP
          // mainbook ask = selling symbol2 for xrp + buying symbol1 with XRP = bridgedBook2 bid + bridgedBook1 ask
          // mainbook bid = selling symbol1 for xrp + buying symbol2 with XRP = bridgedBook1 bid + bridgedBook2 ask
          
          // collect all the bids and asks first and sort them
          var bids1 = [];
          var bids2 = [];
          var asks1 = [];
          var asks2 = [];
          
          var orderbook = bridgedBook1; // symbol1 for xrp
          
          // Bid side of the orderbook
          for(var i=0; i<orderbook.bids.length; i++) {
           if(i<orderbook.bids.length && orderbook.bids[i].specification.quantity.value!=0) {
              var row1 = ""; var bid = 0; var q1 = 0; var counterparty = ""; var counterparty2 = ""; var s1 = ""; var s2="";
              if(orderbook.bids[i].state!=null && orderbook.bids[i].state.fundedAmount!=null && orderbook.bids[i].state.fundedAmount.value>0) {
                 bid = (1.00000000*orderbook.bids[i].specification.totalPrice.value)/(1.00000000*orderbook.bids[i].specification.quantity.value);
                 counterparty = ""+orderbook.bids[i].specification.quantity.counterparty;
                 counterparty2 = ""+orderbook.bids[i].specification.totalPrice.counterparty;
                 q1=orderbook.bids[i].state.fundedAmount.value / bid;
                 s1 = orderbook.bids[i].specification.quantity.currency + (counterparty!="undefined" && (!(orderbook.bids[i].specification.quantity.currency in issuers) || (issuers[orderbook.bids[i].specification.quantity.currency].length>0))? "."+counterparty:"");
                 s2 = orderbook.bids[i].specification.totalPrice.currency + (counterparty2!="undefined" && (!(orderbook.bids[i].specification.totalPrice.currency in issuers) || (issuers[orderbook.bids[i].specification.totalPrice.currency].length>0))? "."+counterparty2:"");
                
              }
              else {
                 bid = (1.00000000*orderbook.bids[i].specification.totalPrice.value)/(1.00000000*orderbook.bids[i].specification.quantity.value);
                 counterparty = ""+orderbook.bids[i].specification.quantity.counterparty;
                 counterparty2 = ""+orderbook.bids[i].specification.totalPrice.counterparty;
                 q1=orderbook.bids[i].specification.quantity.value;
                 s1 = orderbook.bids[i].specification.quantity.currency + (counterparty!="undefined" && (!(orderbook.bids[i].specification.quantity.currency in issuers) || (issuers[orderbook.bids[i].specification.quantity.currency].length>0))? "."+counterparty:"");
                 s2 = orderbook.bids[i].specification.totalPrice.currency + (counterparty2!="undefined" && (!(orderbook.bids[i].specification.totalPrice.currency in issuers) || (issuers[orderbook.bids[i].specification.totalPrice.currency].length>0))? "."+counterparty2:"");
                 
              }
                
                bids1[bids1.length] = {direction:orderbook.bids[i].specification.direction, counterparty:counterparty, counterparty2:counterparty2, qty:parseFloat(q1), symbol1complete:s1, symbol2complete:s2, symbol1:orderbook.bids[i].specification.quantity.currency, symbol2:orderbook.bids[i].specification.totalPrice.currency, price:(bid).toFixed(accuracy)};
            }
          }
          
          for(var i=0; i<orderbook.asks.length; i++) { // iterate through bridgedBook1 asks
            
            // s1 is symbol1, s2 is XRP
            if(orderbook.asks[i].specification.quantity.value!=0) {
              var row2 = ""; var ask = 0; var counterparty = ""; var counterparty2 = ""; var q1 = 0; var s1 = ""; var s2 = "";
              if(orderbook.asks[i].state!=null && orderbook.asks[i].state.fundedAmount!=null && orderbook.asks[i].state.fundedAmount.value>0) {
                 ask = (1.00000000*orderbook.asks[i].specification.totalPrice.value)/(1.00000000*orderbook.asks[i].specification.quantity.value);
                 counterparty = ""+orderbook.asks[i].specification.quantity.counterparty;
                 counterparty2 = ""+orderbook.asks[i].specification.totalPrice.counterparty;
                 q1=orderbook.asks[i].state.fundedAmount.value;
                 s1 = orderbook.asks[i].specification.quantity.currency + (counterparty!="undefined" && (!(orderbook.asks[i].specification.quantity.currency in issuers) || (issuers[orderbook.asks[i].specification.quantity.currency].length>0))? "."+counterparty:"");
                 s2 = orderbook.asks[i].specification.totalPrice.currency + (counterparty2!="undefined" && (!(orderbook.asks[i].specification.totalPrice.currency in issuers) || (issuers[orderbook.asks[i].specification.totalPrice.currency].length>0))? "."+counterparty2:"");
              }
              else {
                 ask = (1.00000000*orderbook.asks[i].specification.totalPrice.value)/(1.00000000*orderbook.asks[i].specification.quantity.value);
                 counterparty = ""+orderbook.asks[i].specification.quantity.counterparty;
                 counterparty2 = ""+orderbook.asks[i].specification.totalPrice.counterparty;
                 q1=orderbook.asks[i].specification.quantity.value;
                 s1 = orderbook.asks[i].specification.quantity.currency + (counterparty!="undefined" && (!(orderbook.asks[i].specification.quantity.currency in issuers) || (issuers[orderbook.asks[i].specification.quantity.currency].length>0))? "."+counterparty:"");
                 s2 = orderbook.asks[i].specification.totalPrice.currency + (counterparty2!="undefined" && (!(orderbook.asks[i].specification.totalPrice.currency in issuers) || (issuers[orderbook.asks[i].specification.totalPrice.currency].length>0))? "."+counterparty2:"");
              }
              
              // bridgedBook1 asks
              asks1[asks1.length] = {direction:orderbook.asks[i].specification.direction, counterparty:counterparty, counterparty2:counterparty2, qty:parseFloat(q1), symbol1complete:s1, symbol2complete:s2, symbol1:orderbook.asks[i].specification.quantity.currency, symbol2:orderbook.asks[i].specification.totalPrice.currency, price:(ask).toFixed(accuracy)};
            }
          }
          
          var orderbook = bridgedBook2; // xrp for symbol2 
          for(var i=0; i<orderbook.bids.length; i++) {
           if(i<orderbook.bids.length && orderbook.bids[i].specification.quantity.value!=0) {
              var row1 = ""; var bid = 0; var q1 = 0; var counterparty = ""; var counterparty2 = ""; var s1 = ""; var s2="";
              if(orderbook.bids[i].state!=null && orderbook.bids[i].state.fundedAmount!=null && orderbook.bids[i].state.fundedAmount.value>0) {
                 bid = (1.00000000*orderbook.bids[i].specification.totalPrice.value)/(1.00000000*orderbook.bids[i].specification.quantity.value);
                 counterparty = ""+orderbook.bids[i].specification.quantity.counterparty;
                 counterparty2 = ""+orderbook.bids[i].specification.totalPrice.counterparty;
                 q1=orderbook.bids[i].state.fundedAmount.value / bid;
                 s1 = orderbook.bids[i].specification.quantity.currency + (counterparty!="undefined" && (!(orderbook.bids[i].specification.quantity.currency in issuers) || (issuers[orderbook.bids[i].specification.quantity.currency].length>0))? "."+counterparty:"");
                 s2 = orderbook.bids[i].specification.totalPrice.currency + (counterparty2!="undefined" && (!(orderbook.bids[i].specification.totalPrice.currency in issuers) || (issuers[orderbook.bids[i].specification.totalPrice.currency].length>0))? "."+counterparty2:"");
                
              }
              else {
                 bid = (1.00000000*orderbook.bids[i].specification.totalPrice.value)/(1.00000000*orderbook.bids[i].specification.quantity.value);
                 counterparty = ""+orderbook.bids[i].specification.quantity.counterparty;
                 counterparty2 = ""+orderbook.bids[i].specification.totalPrice.counterparty;
                 q1=orderbook.bids[i].specification.quantity.value;
                 s1 = orderbook.bids[i].specification.quantity.currency + (counterparty!="undefined" && (!(orderbook.bids[i].specification.quantity.currency in issuers) || (issuers[orderbook.bids[i].specification.quantity.currency].length>0))? "."+counterparty:"");
                 s2 = orderbook.bids[i].specification.totalPrice.currency + (counterparty2!="undefined" && (!(orderbook.bids[i].specification.totalPrice.currency in issuers) || (issuers[orderbook.bids[i].specification.totalPrice.currency].length>0))? "."+counterparty2:"");
                 
              }
                
                bids2[bids2.length] = {direction:orderbook.bids[i].specification.direction, counterparty:counterparty, counterparty2:counterparty2, qty:parseFloat(q1), symbol1complete:s1, symbol2complete:s2, symbol1:orderbook.bids[i].specification.quantity.currency, symbol2:orderbook.bids[i].specification.totalPrice.currency, price:(bid).toFixed(accuracy)};
            }
          }
          for(var i=0; i<orderbook.asks.length; i++) { // iterate through bridgedBook2 asks
            
            // s1 is XRP, s2 is symbol2
            if(orderbook.asks[i].specification.quantity.value!=0) {
              var row2 = ""; var ask = 0; var counterparty = ""; var counterparty2 = ""; var q1 = 0; var s1 = ""; var s2 = "";
              if(orderbook.asks[i].state!=null && orderbook.asks[i].state.fundedAmount!=null && orderbook.asks[i].state.fundedAmount.value>0) {
                 ask = (1.00000000*orderbook.asks[i].specification.totalPrice.value)/(1.00000000*orderbook.asks[i].specification.quantity.value);
                 counterparty = ""+orderbook.asks[i].specification.quantity.counterparty;
                 counterparty2 = ""+orderbook.asks[i].specification.totalPrice.counterparty;
                 q1=orderbook.asks[i].state.fundedAmount.value;
                 s1 = orderbook.asks[i].specification.quantity.currency + (counterparty!="undefined" && (!(orderbook.asks[i].specification.quantity.currency in issuers) || (issuers[orderbook.asks[i].specification.quantity.currency].length>0))? "."+counterparty:"");
                 s2 = orderbook.asks[i].specification.totalPrice.currency + (counterparty2!="undefined" && (!(orderbook.asks[i].specification.totalPrice.currency in issuers) || (issuers[orderbook.asks[i].specification.totalPrice.currency].length>0))? "."+counterparty2:"");
              }
              else {
                 ask = (1.00000000*orderbook.asks[i].specification.totalPrice.value)/(1.00000000*orderbook.asks[i].specification.quantity.value);
                 counterparty = ""+orderbook.asks[i].specification.quantity.counterparty;
                 counterparty2 = ""+orderbook.asks[i].specification.totalPrice.counterparty;
                 q1=orderbook.asks[i].specification.quantity.value;
                 s1 = orderbook.asks[i].specification.quantity.currency + (counterparty!="undefined" && (!(orderbook.asks[i].specification.quantity.currency in issuers) || (issuers[orderbook.asks[i].specification.quantity.currency].length>0))? "."+counterparty:"");
                 s2 = orderbook.asks[i].specification.totalPrice.currency + (counterparty2!="undefined" && (!(orderbook.asks[i].specification.totalPrice.currency in issuers) || (issuers[orderbook.asks[i].specification.totalPrice.currency].length>0))? "."+counterparty2:"");
              }
              
              // bridgedBook2 asks
              asks2[asks2.length] = {direction:orderbook.asks[i].specification.direction, counterparty:counterparty, counterparty2:counterparty2, qty:parseFloat(q1), symbol1complete:s1, symbol2complete:s2, symbol1:orderbook.asks[i].specification.quantity.currency, symbol2:orderbook.asks[i].specification.totalPrice.currency, price:(ask).toFixed(accuracy)};
            }
          }
          
          
          // Sort the bid/asks by price
          bids1.sort(function(a,b) {
              return  b.price - a.price;
          });
          asks1.sort(function(a,b) {
              return a.price - b.price;
          });
          bids2.sort(function(a,b) {
              return  b.price - a.price;
          });
          asks2.sort(function(a,b) {
              return a.price - b.price;
          });
          
          
          
          // mainbook ask = selling symbol2 for xrp + buying symbol1 with XRP = bridgedBook2 bid + bridgedBook1 ask
          var j = 0; // to iterate through bridgedBook2 bids
          var i=0; // iterate through bridgedBook1 asks
          while( i<asks1.length && j<bids2.length) { // iterate through bridgedBook1 asks
            var symbol1Left = asks1[i].qty; 
            var totalSymbol1Sold = 0; 
            var symbol1PriceInXRP = asks1[i].price; // XRP/symbol1
            var symbol2Received = 0; 
            
            // cross the bid/asks
            while(symbol1Left>0 && j<bids2.length) {
              if(bids2[j].qty<=0) { // Ignore empty orders
                j++;
                break;
              }
              var symbol2AvailableToBuy = bids2[j].qty;
              var symbol2PriceInXRP = bids2[j].price; // XRP/symbol2
              var symbol2PriceInSymbol1 = symbol2PriceInXRP/symbol1PriceInXRP; // symbol1/symbol2 = 1/(XRP/symbol1)*XRP/symbol2
              var symbol2ConvertedToSymbol1 = symbol2AvailableToBuy*symbol2PriceInSymbol1;
              var symbol1Sold = Math.max(0, Math.min(symbol1Left, symbol2ConvertedToSymbol1));
              symbol1Left-= symbol1Sold;
              totalSymbol1Sold += symbol1Sold;
              var symbol1SoldConvertedSymbol2 = symbol1Sold/symbol2PriceInSymbol1;
              symbol2Received += symbol1SoldConvertedSymbol2;
              bids2[j].qty-=symbol1SoldConvertedSymbol2;
            }
            
            // Add this the right side of the main book
            currentOrderbook.asks[currentOrderbook.asks.length] = {
              specification: {
                quantity: {currency:symbol1, counterparty:issuer1, value:totalSymbol1Sold},
                totalPrice: {currency:symbol2, counterparty:issuer2, value:symbol2Received},
                direction: "sell"
              }
            };
            
            asks1[i].qty = symbol1Left;
            if(symbol1Left<=0) i++;
          }
          
          // mainbook bid = selling symbol1 for xrp + buying symbol2 with XRP = bridgedBook1 bid + bridgedBook2 ask
          j = 0; // to iterate through bridgedBook2 asks 
          i = 0; // iterate through bridgedBook1 bids
          while(i<bids1.length && j<asks2.length) { // iterate through bridgedBook2 bids
            var symbol1Left = bids1[i].qty; 
            var totalSymbol1Sold = 0; 
            var symbol1PriceInXRP = bids1[i].price; // XRP/symbol1
            var symbol2Received = 0; 
            
            // cross the bid/asks
            while(symbol1Left>0 && j<asks2.length) {
              if(asks2[j].qty<=0) { // Ignore empty orders
                j++;
                break;
              }
              var symbol2AvailableToBuy = asks2[j].qty;
              var symbol2PriceInXRP = asks2[j].price; // XRP/symbol2
              var symbol2PriceInSymbol1 = symbol2PriceInXRP/symbol1PriceInXRP; // symbol1/symbol2 = 1/(XRP/symbol1)*XRP/symbol2
              var symbol2ConvertedToSymbol1 = symbol2AvailableToBuy*symbol2PriceInSymbol1;
              var symbol1Sold = Math.max(0, Math.min(symbol1Left, symbol2ConvertedToSymbol1));
              symbol1Left-= symbol1Sold;
              totalSymbol1Sold += symbol1Sold;
              var symbol1SoldConvertedSymbol2 = symbol1Sold/symbol2PriceInSymbol1;
              symbol2Received += symbol1SoldConvertedSymbol2;
              asks2[j].qty-=symbol1SoldConvertedSymbol2;
            }
            
            
            // Add this the left side of the main book
            currentOrderbook.bids[currentOrderbook.bids.length] = {
              specification: {
                quantity: {currency:symbol1, counterparty:issuer1, value:totalSymbol1Sold},
                totalPrice: {currency:symbol2, counterparty:issuer2, value:symbol2Received},
                direction: "buy"
              }
            };
            
            bids1[i].qty = symbol1Left;
            if(symbol1Left<=0) i++;
          }
          
        }
      }
      catch(ex) {
        console.log("Error combining bridged orderbooks: "+ex);
      }
      
  }, function (err) {
      console.log("Error combining bridged orderbooks: "+err);
      return null;
  }).then(function() {
  
  
    // Display the final orderbook
    
    var orderbook = currentOrderbook;
    
    // Hide orderbook and display error if it's empty and again not while we're typing
    if(!updateMessageOnly && showOrderbook && numIntervals>1 && getSelectedText()=="" && symbol1.length==3 && symbol2.length==3 && orderbook==null) {
      orderbookExists = false;
      if(action!="issue" && action!="send") {
        errored = true;
        $("#errors").html("No orderbook for tokens "+symbol1+" / "+symbol2+" found. Check spelling or issuer/backer.");
        console.log("No orderbook for "+symbol1+"."+issuer1+" / "+symbol2+"."+issuer2);
      }
    }
    else if(action!="issue" && action!="send" && orderbook!=null && $("#errors").html().indexOf("No orderbook")>=0) {
      $("#errors").html("");
    }
    
    // If the orderbook takes a little bit to load
    if(action=="issue" && symbol1!="" && symbol1!=baseCurrency && orderbook!=null && Math.max(orderbook.bids.length, orderbook.asks.length)>0) {
      errored=true;
      var issuedText = getIssuedText();
      if(stripHTML($("#errors").html()).indexOf(stripHTML(issuedText))<0) {
        $("#errors").html(issuedText);
        refreshLayout();
      }
    }
    
    // If we don't already have an error, display the default page description depending on the action selected
    // To prevent this block from displaying the default page description, set errored=true, which gets reset to false on any action, symbol, or setting changes
    if(!errored) {
      if(action!="issue" && action!="send" && $.trim( $('#orderbook').html() ).length) {
        $("#errors").html("&nbsp;");
        refreshLayout();
      }
      else if(action=='issue' && (symbol1=="" || orderbook==null || Math.max(orderbook.bids.length, orderbook.asks.length)==0)) {
          errored=true;
          $("#errors").html("Issue your own token for others trade and represent anything you can think of.<br />Token symbols must be exactly 3 letters and cannot be '"+baseCurrency+"'.<br /><br />Offer your symbol for "+baseCurrency+" to automatically offer for every symbol<br /> and accept any form of exchange. (think of it as a wildcard)<br /><br />See: <a href='#represent' onclick='document.getElementById(\"about\").style.display=\"block\"; setURL(\"#represent\"); jQuery(\"html,body\").animate({scrollTop: jQuery(\"#represent\").offset().top}, 1000); return false;'>Issue Tokens to Represent Any Form of Value or Ownership</a>");
          refreshLayout();
      }
      else if(action=='send') {
          errored=true;
          var qrsize = 196;
          if(isMobile()) qrsize = 256;
          $("#errors").html("Send to others by inputting their account address above.<br />For non-XRP, make sure they set their <a href='#' onclick='aboutReceivables(); return false;'>Receivable Tokens</a> list.<br /><br />To receive or let others send to you, share the below link or QR Code:<br /><input type='text' value='https://www.theworldexchange.net/?action=send&amp;recipient="+address+($("#qty1").val()==""? "":"&amp;qty1="+$("#qty1").val())+($("#symbol1").val()==""? "":"&amp;symbol1="+$("#symbol1").val()+(issuer1==""? "":"."+issuer1))+"' onclick='this.select();' readonly='readonly' class='linkShare' /><br /><br /><div id='qrcode' style='text-align:center; margin:auto; width:"+qrsize+"px;'> </div>"+(address==""? "<br />(Note: <a href='#' onclick='showLogin();'>Login</a> first to get a valid link/QR with your address.)":""));
          new QRCode(document.getElementById("qrcode"), {text:"https://www.theworldexchange.net/?action=send&recipient="+address+($("#qty1").val()==""? "":"&qty1="+$("#qty1").val())+($("#symbol1").val()==""? "":"&symbol1="+$("#symbol1").val()+(issuer1==""? "":"."+issuer1)), width:qrsize, height:qrsize});
          refreshLayout();
      }
      else refreshLayout();
    }
    
    // Parse through the orderbook and turn it into an HTML table
    if(!updateMessageOnly && showOrderbook && orderbook!=null && orderbookExists) {
    
      var bidasktable = "";
  
      // Create table header
      var cols = 5;
      bidasktable += "<table><tr><td colspan='"+(cols)+"' style='text-align:left;'>Offers to Buy</td><td colspan='1' style='text-align:center; overflow:hidden;'><a href='?action="+(action=="sell"? "buy":"sell")+"&amp;qty1="+($("#qty1").val()*$("#price").val())+"&amp;symbol1="+symbol2+(issuer2==""? "":"."+issuer2)+"&amp;price="+(1/$("#price").val())+"&amp;symbol2="+symbol1+(issuer1==""? "":"."+issuer1)+"' target='_blank' onclick='loadURLSymbols(\""+(action=="sell"? "buy":"sell")+"\", $(\"#qty1\").val()*$(\"#price\").val(), \""+symbol2+(issuer2==""? "":"."+issuer2)+"\", 1/$(\"#price\").val(), \""+symbol1+(issuer1==""? "":"."+issuer1)+"\"); return false;'>Switch</a> </td><td colspan='"+(cols)+"' style='text-align:right;'>Offers to Sell</td></tr>";
      
      var bids = [];
      var asks = [];
      var bidTotal = 0;
      var askTotal = 0;
      
      // Iterate through both sides of the orderbook simultaneously
      for(var i=0; i<Math.max(orderbook.bids.length, orderbook.asks.length); i++) {

         // Bid side of the orderbook
         if(i<orderbook.bids.length && orderbook.bids[i].specification.quantity.value!=0) {
          var row1 = ""; var bid = 0; var q1 = 0; var counterparty = ""; var counterparty2 = ""; var s1 = ""; var s2="";
          if(orderbook.bids[i].state!=null && orderbook.bids[i].state.fundedAmount!=null && orderbook.bids[i].state.fundedAmount.value>0) {
             bid = (1.00000000*orderbook.bids[i].specification.totalPrice.value)/(1.00000000*orderbook.bids[i].specification.quantity.value);
             counterparty = ""+orderbook.bids[i].specification.quantity.counterparty;
             counterparty2 = ""+orderbook.bids[i].specification.totalPrice.counterparty;
             q1=orderbook.bids[i].state.fundedAmount.value / bid;
             s1 = orderbook.bids[i].specification.quantity.currency + (counterparty!="undefined" && (!(orderbook.bids[i].specification.quantity.currency in issuers) || (issuers[orderbook.bids[i].specification.quantity.currency].length>0))? "."+counterparty:"");
             s2 = orderbook.bids[i].specification.totalPrice.currency + (counterparty2!="undefined" && (!(orderbook.bids[i].specification.totalPrice.currency in issuers) || (issuers[orderbook.bids[i].specification.totalPrice.currency].length>0))? "."+counterparty2:"");
            
          }
          else {
             bid = (1.00000000*orderbook.bids[i].specification.totalPrice.value)/(1.00000000*orderbook.bids[i].specification.quantity.value);
             counterparty = ""+orderbook.bids[i].specification.quantity.counterparty;
             counterparty2 = ""+orderbook.bids[i].specification.totalPrice.counterparty;
             q1=orderbook.bids[i].specification.quantity.value;
             s1 = orderbook.bids[i].specification.quantity.currency + (counterparty!="undefined" && (!(orderbook.bids[i].specification.quantity.currency in issuers) || (issuers[orderbook.bids[i].specification.quantity.currency].length>0))? "."+counterparty:"");
             s2 = orderbook.bids[i].specification.totalPrice.currency + (counterparty2!="undefined" && (!(orderbook.bids[i].specification.totalPrice.currency in issuers) || (issuers[orderbook.bids[i].specification.totalPrice.currency].length>0))? "."+counterparty2:"");
             
          }
            
            bids[bids.length] = {direction:orderbook.bids[i].specification.direction, counterparty:counterparty, counterparty2:counterparty2, qty:parseFloat(q1), symbol1complete:s1, symbol2complete:s2, symbol1:orderbook.bids[i].specification.quantity.currency, symbol2:orderbook.bids[i].specification.totalPrice.currency, price:(bid).toFixed(accuracy)};
            bidTotal+=parseFloat(q1);
        }
        
        // Ask side of the orderbook
        if(i< orderbook.asks.length && orderbook.asks[i].specification.quantity.value!=0) {
          var row2 = ""; var ask = 0; var counterparty = ""; var counterparty2 = ""; var q1 = 0; var s1 = ""; var s2 = "";
          if(orderbook.asks[i].state!=null && orderbook.asks[i].state.fundedAmount!=null && orderbook.asks[i].state.fundedAmount.value>0) {
             ask = (1.00000000*orderbook.asks[i].specification.totalPrice.value)/(1.00000000*orderbook.asks[i].specification.quantity.value);
             counterparty = ""+orderbook.asks[i].specification.quantity.counterparty;
             counterparty2 = ""+orderbook.asks[i].specification.totalPrice.counterparty;
             q1=orderbook.asks[i].state.fundedAmount.value;
             s1 = orderbook.asks[i].specification.quantity.currency + (counterparty!="undefined" && (!(orderbook.asks[i].specification.quantity.currency in issuers) || (issuers[orderbook.asks[i].specification.quantity.currency].length>0))? "."+counterparty:"");
             s2 = orderbook.asks[i].specification.totalPrice.currency + (counterparty2!="undefined" && (!(orderbook.asks[i].specification.totalPrice.currency in issuers) || (issuers[orderbook.asks[i].specification.totalPrice.currency].length>0))? "."+counterparty2:"");
          }
          else {
             ask = (1.00000000*orderbook.asks[i].specification.totalPrice.value)/(1.00000000*orderbook.asks[i].specification.quantity.value);
             counterparty = ""+orderbook.asks[i].specification.quantity.counterparty;
             counterparty2 = ""+orderbook.asks[i].specification.totalPrice.counterparty;
             q1=orderbook.asks[i].specification.quantity.value;
             s1 = orderbook.asks[i].specification.quantity.currency + (counterparty!="undefined" && (!(orderbook.asks[i].specification.quantity.currency in issuers) || (issuers[orderbook.asks[i].specification.quantity.currency].length>0))? "."+counterparty:"");
             s2 = orderbook.asks[i].specification.totalPrice.currency + (counterparty2!="undefined" && (!(orderbook.asks[i].specification.totalPrice.currency in issuers) || (issuers[orderbook.asks[i].specification.totalPrice.currency].length>0))? "."+counterparty2:"");
          }
          
          asks[asks.length] = {direction:orderbook.asks[i].specification.direction, counterparty:counterparty, counterparty2:counterparty2, qty:parseFloat(q1), symbol1complete:s1, symbol2complete:s2, symbol1:orderbook.asks[i].specification.quantity.currency, symbol2:orderbook.asks[i].specification.totalPrice.currency, price:(ask).toFixed(accuracy)};
          askTotal+=parseFloat(q1);
        }
      }
      
      // Sort the bid/asks by price
      bids.sort(function(a,b) {
          return  b.price - a.price;
      });
      asks.sort(function(a,b) {
          return a.price - b.price;
      });
      
      // Aggregate the bid/asks that are at the same price
      var aggregatedBids = [];
      var aggregatedAsks = [];
      for(var i=0; i<bids.length; i++) {
        if(aggregatedBids.length==0 || aggregatedBids[aggregatedBids.length-1].price!=bids[i].price)
          aggregatedBids[aggregatedBids.length] = bids[i];
        else aggregatedBids[aggregatedBids.length-1].qty+=bids[i].qty;
      }
      for(var i=0; i<asks.length; i++) {
        if(aggregatedAsks.length==0 || aggregatedAsks[aggregatedAsks.length-1].price!=asks[i].price)
          aggregatedAsks[aggregatedAsks.length] = asks[i];
        else aggregatedAsks[aggregatedAsks.length-1].qty+=asks[i].qty;
      }
      bids = aggregatedBids;
      asks = aggregatedAsks;
      
      //console.log(bids);
      //console.log(asks);
      
      // Update market price of XRP
      if(symbol1=="XRP" && symbol2=="USD" && bids.length>0) baseToDollar = bids[0].price;
      
      // Build the HTML for the orderbook
      for(var j=0; j<Math.min(bookdepth, Math.max(bids.length, asks.length)); j++) {
      
        // Clicking on bid/asks gives you a slightly overpaid order to make sure you don't miss the fill by a penny due to rounding error
        var bidurl = j>=bids.length? "":"<a target='_blank' href='?action=sell&amp;symbol1="+bids[j].symbol1complete+"&amp;price="+(parseFloat(bids[j].price)<0.000002? parseFloat(bids[j].price):parseFloat(parseFloat(bids[j].price)-0.000001))+"&amp;symbol2="+bids[j].symbol2complete+"' onclick='loadURLSymbols(\"sell\", "+bids[j].qty+", \""+bids[j].symbol1complete+"\", "+(parseFloat(bids[j].price)<0.000002? parseFloat(bids[j].price):parseFloat(parseFloat(bids[j].price)-0.000001))+", \""+bids[j].symbol2complete+"\"); return false;'>";
        var bidurlprice = j>=bids.length? "":"<a target='_blank' href='?action=sell&amp;qty1="+(bids[j].qty)+"&amp;symbol1="+bids[j].symbol1complete+"&amp;price="+(parseFloat(bids[j].price)<0.000002? parseFloat(bids[j].price):parseFloat(parseFloat(bids[j].price)-0.000001))+"&amp;symbol2="+bids[j].symbol2complete+"' onclick='loadURLPrice(\"sell\", \""+bids[j].symbol1complete+"\", "+(parseFloat(bids[j].price)<0.000002? parseFloat(bids[j].price):parseFloat(parseFloat(bids[j].price)-0.000001))+", \""+bids[j].symbol2complete+"\"); return false;'>";
        var askurl = j>=asks.length? "":"<a target='_blank' href='?action=buy&amp;qty1="+(asks[j].qty)+"&amp;symbol1="+asks[j].symbol1complete+"&amp;price="+parseFloat(parseFloat(asks[j].price)+0.000001)+"&amp;symbol2="+asks[j].symbol2complete+"' onclick='loadURLSymbols(\"buy\", "+asks[j].qty+", \""+asks[j].symbol1complete+"\", "+parseFloat(parseFloat(asks[j].price)+0.000001)+", \""+asks[j].symbol2complete+"\"); return false;'>";
        var askurlprice = j>=asks.length? "":"<a target='_blank' href='?action=buy&amp;symbol1="+asks[j].symbol1complete+"&amp;price="+parseFloat(parseFloat(asks[j].price)+0.000001)+"&amp;symbol2="+asks[j].symbol2complete+"' onclick='loadURLPrice(\"buy\", \""+asks[j].symbol1complete+"\", "+parseFloat(parseFloat(asks[j].price)+0.000001)+", \""+asks[j].symbol2complete+"\"); return false;'>";
        
        // Estimate displaying as many digits as we can, using abbreviations like 110K otherwise if the number is too long
        bidasktable += "<tr>" 
        +(j<bids.length? 
        //"<td>"+bidurl+""+bids[j].direction+"</a></td>"
        "<td>"+bidurl+""+nFormatter(parseFloat(bids[j].qty.toFixed(Math.max(0, accuracy-2-Math.round(bids[j].qty).toString().length))), 4)+"</a></td>"
        +"<td>"+bids[j].symbol1+"</td>"
        +"<td>@</td>"
        +"<td>"+bidurlprice+nFormatter(parseFloat(parseFloat(bids[j].price).toFixed(Math.max(0, accuracy-Math.round(bids[j].price).toString().length))), accuracy)+"</a></td>"
        +"<td style='text-align; left;'>"+bids[j].symbol2+"</td>"
        :"<td colspan='"+cols+"'> </td>")
        +"<td> </td>"
        +(j<asks.length? 
        //"<td>"+askurl+""+asks[j].direction+"</a></td>"
        "<td>"+askurl+""+nFormatter(parseFloat(asks[j].qty.toFixed(Math.max(0, accuracy-2-Math.round(asks[j].qty).toString().length))), 4)+"</a></td>"
        +"<td>"+asks[j].symbol1+"</td>"
        +"<td>@</td>"
        +"<td>"+askurlprice+nFormatter(parseFloat(parseFloat(asks[j].price).toFixed(Math.max(0, accuracy-Math.round(asks[j].price).toString().length))), accuracy)+"</a></td>"
        +"<td style='text-align; left;'>"+asks[j].symbol2+"</td>"
        :"<td colspan='"+cols+"'> </td>")+"</tr>";
      }
      
      // If the marketcap we looked up is less than what's in the orderbook, use what's in the orderbook
      if(mktcap1<askTotal) mktcap1 = askTotal;
      if(mktcap2<bidTotal) mktcap2 = bidTotal;
      
      // Flip the sides because it's more natural to show marketcap of what's being sold
      bidasktable+="<tr><td colspan='"+(cols)+"' style='text-align:left; border-width:0px;'>Total "+symbol2+" Issued: "+(mktcap2==0? "---":nFormatter(mktcap2, 2))+"</td><td colspan='1' style='border-width:0; text-align:center; overflow:hidden;'>"+new Date(Date.now()).toLocaleTimeString('en-GB')+"</td><td colspan='"+(cols)+"' style='text-align:right; border-width:0px;'>Total "+symbol1+" Issued: "+(mktcap1==0? "---":nFormatter(mktcap1, 2))+"</td></tr>";
      
      bidasktable += "</table>";
      
      return bidasktable;
    }
    else return ""; 
  }, function(err) { console.log("Error building orderbook info: "+err); return ""; }).then(function(bidasktable) { 

      // Show or hide the book depending if we have anything; again don't update while we're typing
      if(getSelectedText()=="") {
        if(showOrderbook && orderbookExists) {
            if(bidasktable!="") $("#orderbook").html(bidasktable);
            refreshLayout();
        }
        else {
          var empty =  !$.trim( $('#orderbook').html() ).length;
          if(!empty) {
            //console.log("Empty orderbook.");
            $("#orderbook").html("");
            refreshLayout();
          }
        }
      }
     
    try {
      // Back and forth loop with loadAccount
      if(repeat) loadAccount(true);
    }
    catch(err) {
      // Load account should already be restarting the loop without us doing it here
      console.log("Error loading account from interval refresh: "+err);
    }
    
  }, function(err) { console.log("Error finishing orderbook: "+err); });
  
  }
  catch (exxx) {
    // If anything unexpected arises, restart the orderbook loop
    console.log("Uncaught exception in loadOrderbook: "+exxx);
    console.log("Restarting orderbook refresh...");
    if(repeat) 
      interruptableTimer(loadOrderbook);
  }
}

// The help text after you issued a token
function getIssuedText() {
  return "Share the below link to let others trade your "+symbol1+" token:<br /><input type='text' value='https://www.theworldexchange.net/?symbol1="+symbol1+"."+address+"&amp;symbol2="+symbol2+"."+issuer2+"' onclick='this.select();' readonly='readonly' class='linkShare' /><br /><br />For next steps if doing an actual sale or ICO, such as legal docs, see: <br /><a href='#ico' onclick='document.getElementById(\"about\").style.display=\"block\"; setURL(\"#ico\"); jQuery(\"html,body\").animate({scrollTop: jQuery(\"#ico\").offset().top}, 1000); return false;'>How to Create a Token Offering (ICO / ITO)</a><br /><br />"+(settings["defaultRipple"]? "Your settings allow token holders to both trade and send to others.<br />To disallow sending so users can only trade in the open market, click <a href='#' onclick='updateDefaultRipple(false);'>here</a>.":"Your settings only allow token holders to trade but not send to others.<br />To allow users to send to others as well, click <a href='#' onclick='updateDefaultRipple(true);'>here</a>.");
}

// Update the URL depending on what we put in the forms
function updateURL() {
  history.pushState(null, null, "/?"+(action=="buy"? "":"action="+action+"&")+"symbol1="+symbol1+(issuer1==""? "":"."+issuer1)+($("#qty1").val()==""? "":"&qty1="+$("#qty1").val())+(action=="send"? ($("#recipient").val()==""? "":"&recipient="+$("#recipient").val()):"&symbol2="+symbol2+(issuer2==""? "":"."+issuer2)+($("#price").val()!=""? "&price="+$("#price").val():"")));
}

// Set the URL to something specific
function setURL(url) {
  history.pushState(null, null, "/"+url);
}

// Refresh state variables when the action is changed
function updateAction() {
    
    var aSelect = document.getElementById('action');
    action = document.getElementById('action').value;
    
    // Redundant lookup of first symbol to do some logic with it here
    var symParts = document.getElementById('symbol1').value.split('.');
    document.getElementById('symbol1').value=symParts[0].toUpperCase()+(symParts.length>1? "."+symParts[1]:"");
    var urlIssuer1="";
    if(symParts.length>1) {
      urlIssuer1 = symParts[1];
    }
    
    // Reset errored flags so default page descriptions can show
    errored = false;
    
    if(action=='issue') {
      // Clear the fields if you're on Issue and was looking at another existing symbol
      lastIssuer1 = issuer1;
      lastSymbol1 = symParts[0].toUpperCase();
      lastIssuer2 = issuer2;
      lastSymbol2 = document.getElementById('symbol2').value.split('.')[0].toUpperCase();
      $("#symbol1").autocomplete({source: []});
      if($("#symbol1").val()=="" || $("#symbol1").val()==baseCurrency || (issuer1!=address && urlIssuer1!=address)) {
        $("#symbol1").val("");
        $("#symbol2").val(baseCurrency);
      }
    }
    else {
      // Refresh symbols autocomplete list in case
      var symbolsList = symbolLister();
      $("#symbol1").autocomplete({ source:symbolsList});
      
      // Restore what you were looking at before you switched to the issue tab, which cleared the fields
      if(($("#symbol1").val()==lastSymbol1 || ($("#symbol1").val()=="" && lastSymbol1!="")) && (issuer1==address || issuer1==lastIssuer1) && lastIssuer1!="") {
        symbol1 = lastSymbol1; $("#symbol1").val(lastSymbol1); issuer1 = lastIssuer1;
        symbol2 = lastSymbol2; $("#symbol2").val(lastSymbol2); issuer2 = lastIssuer2;
      }
      // Set to default XRP by USD if fields are blank
      else if($("#symbol1").val()=="" && lastIssuer1=="") {
        $("#symbol1").val(baseCurrency);
        if($("#symbol2").val()==baseCurrency) {
          $("#symbol2").val("USD");
        }
      }
    }
    
    // Change form for sending
    if(action=='send') {
        $("#issuer2Label").css("visibility", "visible");
        document.getElementById('recipientField').style.display = 'inline';
        document.getElementById('counterparty').style.display = 'none';
        document.getElementById('sendOptionsLabel').style.display = 'inline';
        document.getElementById('backedby2').style.display = 'none';
        document.getElementById('issuer2').style.display = 'none';
        showOrderbook = false;
        updateSymbol1();
        //document.getElementById('issuer2Width').style.opacity = 0;
    } else {
        document.getElementById('recipientField').style.display = 'none';
        document.getElementById('counterparty').style.display = 'inline';
        document.getElementById('sendOptionsLabel').style.display = 'none';
        document.getElementById('backedby2').style.display = 'inline';
        document.getElementById('issuer2').style.display = 'inline';
        showOrHideOrderbook();
        updateSymbols();
        
    }
    refreshLayout();
    if(action!="issue") loadOrderbook(true, false); // Instant page descriptions update w/o slow orderbook query
    refreshImmediately = true; // Tell the orderbook query to run immediately anyway
}

// Update both marketcaps
function updateMarketCaps() {
  updateMarketCap1();
  updateMarketCap2();
}

// Update market cap of the first symbol
function updateMarketCap1() {
  
    if((mktcap1==0 || mktcapName1!=symbol1+"."+issuer1)) {
      mktcap1 = 0;
      
      // Look up non-XRP symbols
      if(symbol1!=baseCurrency) {
      
        // Look up the issuer via API first
        //console.log("Fetching mktcap1 as obligation of "+issuer1+"...");
        api.getBalanceSheet(issuer1).then(function(sheet) {
          //console.log(sheet);
          if(sheet!=null && sheet.obligations!=null) {
            for(var i = 0; i<sheet.obligations.length; i++) {
              if(sheet.obligations[i].currency==symbol1) {
                mktcap1 = parseFloat(sheet.obligations[i].value);
                mktcapName1=symbol1+"."+issuer1;
                break;
              }
            }
          }
        }, function(err) {console.log("Error mktcap1 getBalanceSheet: "+err);}).then(function() {

          // Look up using the Data API if the above fails
          if(mktcap1==0) {
            var url = dataAPI+"/v2/capitalization/"+symbol1+"+"+issuer1+"?limit=1&descending=true";
            //console.log("No mktcap1 from issuer. Pulling data API: "+url);
            $.get( url, function( data ) {
                try {
                  mktcap1 = parseFloat(stripHTML(data.rows[0].amount)).toFixed(0);
                  mktcapName1=symbol1+"."+issuer1;
                }
                catch (err) { 
                  mktcap1=0;
                }
            }, "json" );
          }
        }, function(err) {console.log("Error mktcap1 data API: "+err);});
      }
      else {
      
        // Use Data API to look up XRP distribution
        var url = dataAPI+"/v2/network/xrp_distribution?limit=1&descending=true";
        $.get( url, function( data ) {
            try {
              mktcap1 = parseFloat(stripHTML(data.rows[0].distributed)).toFixed(0);
              mktcapName1=symbol1+"."+issuer1;
            }
            catch (err) { 
              mktcap1=0; 
            }
        }, "json" );
      }
    }
}

// Look up marketcap for second symbol
function updateMarketCap2() {
    if((mktcap2==0 || mktcapName2!=symbol2+"."+issuer2)) {
      mktcap2 = 0;
      
      // Look up non-XRP symbols
      if(symbol2!=baseCurrency) {
      
          // Look up the issuer via API first
          //console.log("Fetching mktcap2 as obligation of "+issuer2+"...");
          api.getBalanceSheet(issuer2).then(function(sheet) {
            //console.log(sheet);
            if(sheet!=null && sheet.obligations!=null) {
              for(var i = 0; i<sheet.obligations.length; i++) {
                if(sheet.obligations[i].currency==symbol2) {
                  mktcap2 = parseFloat(sheet.obligations[i].value);
                  mktcapName2=symbol2+"."+issuer2;
                  break;
                }
              }
            }
          }, function(err) {console.log("Error mktcap2 getBalanceSheet: "+err);}).then(function() {
            
            // Check Data API if above fails
            if(mktcap2==0) {
              var url = dataAPI+"/v2/capitalization/"+symbol2+"+"+issuer2+"?limit=1&descending=true";
              $.get( url, function( data ) {
                  try {
                    mktcap2 = parseFloat(stripHTML(data.rows[0].amount)).toFixed(0);
                    mktcapName2=symbol2+"."+issuer2;
                  }
                  catch (err) {
                    mktcap2=0;
                  }
              }, "json" );
            }
          }, function(err) {console.log("Error mktcap2 data API: "+err);});
      }
      else {
      
        // Look up Data API for XRP distribution
        var url = dataAPI+"/v2/network/xrp_distribution?limit=1&descending=true";
        $.get( url, function( data ) {
            try {
              mktcap2 = parseFloat(stripHTML(data.rows[0].total)).toFixed(0);
              mktcapName2=symbol2+"."+issuer2;
            }
            catch (err) { 
              mktcap2=0;
            }
        }, "json" );
      }
    }
}


// Update state variables for symbols
function updateSymbols() {
  updateSymbol1();
  updateSymbol2();
}

// Symbol on the left
function updateSymbol1() {
  
  var oldSymbol = symbol1;
  var oldIssuer = issuer1;
  
  // Parse symbol.issuerAddress format
  var symParts = document.getElementById('symbol1').value.split('.');
  document.getElementById('symbol1').value=symParts[0].toUpperCase()+(symParts.length>1? "."+symParts[1]:"");
  
  // Check correctness of symbol before using it
  if(symParts[0].length==0) symbol1 = "";
  else if(symParts[0]==baseCurrency && action=="issue") {
    errored = true;
    $("#errors").html("Invalid symbol to issue. Choose a different name to issue your own symbol.");
    symbol1 = "";
  }
  else if(symParts[0].length>0 && symParts[0].length!=3) {
    errored = true;
    $("#errors").html("Symbols must be exactly 3 letters.");
    symbol1 = "";
  }
  else {
    if(!errored && !(action=="issue" && $("#errors").html().indexOf("Issue")>0)) {
      $("#errors").html("&nbsp;");
      refreshImmediately = true;
    }
    
    if(symParts[0].length==3) {
      symbol1=symParts[0].toUpperCase();
      if(symParts.length>1) {
        issuer1 = symParts[1];
        document.getElementById('symbol1').value = symbol1;
      }
    }
  }
  
  // Check for issuers to default to
  if(symbol1!="") {
    if(action=="issue") {
      issuer1=address;
    }
    else if(symbol1 in issuers && issuers[symbol1].length>0 && issuer1=="") { 
      if(issuer2!="" && $.inArray(issuer2, issuers[symbol1])>-1) issuer1 = issuer2;
      else issuer1=issuers[symbol1][0];
    }
    else if(!(symbol1 in issuers) && issuer1=="") issuer1 = "[ Enter Address ]";
  }
  
  // Clear issuer for XRP or if some other symbol has no issuers
  if(symbol1==baseCurrency || (symbol1 in issuers && issuers[symbol1].length==0)) issuer1="";
  
  
  // Hide issuer label if there is no issuer and we aren't issuing something
  if(issuer1!="" || action =="issue") {
    $("#issuer1Label").css("visibility", "visible");
    var issuerName = getIssuerName(issuer1);
    $("#issuer1").html("<a href='#' onclick='"+(action=="issue"? "showIssuerYou();":"showIssuer1();")+"'>"+(issuerName.length<=12? issuerName:issuerName.substring(0, 12)+"...")+"</a>");
  }
  else {
    $("#issuer1Label").css("visibility", "hidden");
    $("#issuer1").html("");
  }
  
  showOrHideOrderbook();
  refreshLayout();
  
  // Force an orderbook refresh immediately when symbol changes
  if(symbol1!=oldSymbol || issuer1!=oldIssuer || action=="send") refreshImmediately = true;
}

// Symbol on the right
function updateSymbol2() {
  var oldSymbol = symbol2;
  var oldIssuer = issuer2;

  // Parse symbol.issuerAddress format
  var symParts = document.getElementById('symbol2').value.split('.');
  document.getElementById('symbol2').value=symParts[0].toUpperCase()+(symParts.length>1? "."+symParts[1]:"");
  
  // Check correctness of symbol before using it
  if(symParts[0].length==0) symbol2 = "";
  else if(symParts[0].length>0 && symParts[0].length!=3) {
    errored = true;
    $("#errors").html("Token symbols must be exactly 3 letters.");
    symbol2 = "";
  }
  else if (symParts[0].length==3) {
  
    symbol2=symParts[0].toUpperCase();
    if(symParts.length>1) {
      issuer2 = symParts[1];
      document.getElementById('symbol2').value = symbol2;
    }
  }
  
  // Check for issuers to default to
  if(symbol2!="") {
    if(symbol2 in issuers && issuers[symbol2].length>0 && issuer2=="") {
      if(issuer1!="" && $.inArray(issuer1, issuers[symbol2])>-1) issuer2 = issuer1;
      else issuer2=issuers[symbol2][0];
    }
    else if(!(symbol2 in issuers) && issuer2=="") issuer2 = "[ Enter Address ]";
  }
  
  // Clear issuer for XRP or if some other symbol has no issuers
  if(symbol2 in issuers && issuers[symbol2].length==0) issuer2="";
  
  // Hide issuer label if there is no issuer and we aren't issuing something
  if(issuer2!="" || action=="send") { // not when it's send action, which shares the field for send options
    //console.log("issuer2="+issuer2);
    $("#issuer2Label").css("visibility", "visible");
    var issuerName = getIssuerName(issuer2);
    $("#issuer2").html("<a href='#' onclick='showIssuer2();'>"+(issuerName.length<=12? issuerName:issuerName.substring(0, 12)+"...")+"</a>");
  }
  else {
    //console.log("issuer2 hidden");
    $("#issuer2Label").css("visibility", "hidden");
    $("#issuer2").html("");
  }

  showOrHideOrderbook();
  refreshLayout();
  
  // Update orderbook immediately if symbol changes
  if(symbol2!=oldSymbol || issuer2!=oldIssuer || action=="send") refreshImmediately = true;
}

// Calculate whether we should show or hide the orderbook (either we are issuing something and logged in or on the buy/sell tabs)
function showOrHideOrderbook() {
  showOrderbook = symbol1!="" && symbol2!="" && (symbol1!=symbol2 || issuer1!=issuer2) && (action!="issue" || address!="") && action != "send";
  if(!showOrderbook) $("#orderbook").html(""); // Hide the orderbook instantly if we shouldn't show it
}

// Resize the layout to fit the page
function rescaleWindow(resizeChat) {
  if(resizeChat===undefined || resizeChat=='undefined') resizeChat = true;
  $('#container').css('height', Math.floor($(window).height()*.97)+'px');
  $("#particles-js").css("height", ($("#container").height()-70-5)+"px");
  $("#loginBackground").css("height", (windowHeight())+"px");
  
  if(!isMobile()) {
    $("#container").css("position", "absolute");
    $("#container").css("top", "0");
    $("#particles-js").css("display", "block");
  }
  else {
    $("#container").css("position", "static");
    $("#particles-js").css("display", "none");
  }
  
  temp = Math.floor(Math.max(50, ($("#container").height()*.42- $("#topHalf").height() - $("#trade").height())));
  $('#trade').css('margin-top', temp+'px');
  
  if($(window).width()<=1450) $("#destTagDisplay").css("display", "none");
  else $("#destTagDisplay").css("display", "inline");
  
  refreshLayout(); // has to be before chat fullscreen because of dependency on other element positions
  
  if(resizeChat && showChat) {
    rescaleChat();
  }
}
function rescaleChat() {
  if(isMobile() || chatIsFullScreen())
    chatFullScreen();
  else resetChatSize();
  refreshChatLayout();
}
// Recenter content after text changes
function refreshLayout() {
  // controlMiscMenu only hidden for desktop, in which case show the miscMenu always
  if(!isMobile() || ($("#showMiscMenu").css("display")=="none" && $("#hideMiscMenu").css("display")=="none"))
    $("#miscMenu").css("display", "block");
  else if($("#showMiscMenu").css("display")!="none")
    $("#miscMenu").css("display", "none");
  else
    $("#miscMenu").css("display", "block");
  
  
  if(action!="send" && $("#issuer2Width").length && Math.abs($("#counterparty").width()-$("#issuer2Width").width())>5) $("#issuer2Width").css("width", Math.floor($("#counterparty").width())+"px");
  else if(action=="send" && $("#issuer2Width").length && Math.abs(1.2*$("#recipient").width()-$("#issuer2Width").width())>5) $("#issuer2Width").css("width", Math.floor(1.2*$("#recipient").width())+"px");
  
  temp = Math.floor(Math.max(10, (($("#container").height()-$('#content').height()-$('#footer').height()-20))));
  $('#footer').css('margin-top', temp+'px');
    
}

// Calculate correct window height, in case of min-height etc		
function windowHeight() {		
  return Math.max($(window).height(), $("#containerpadding").height());		
}

// Show the login window
function showLogin(resetFields) {
  if(resetFields===undefined || resetFields=='undefined') resetFields = true;

  // Hide for logged in users in case they want to be on the safe side
  //hideChatbox();
  
  if(resetFields) {
    $("#accountInput").val(address);
    $("#keyInput").val("");
    $("#disclaimerRead").prop("checked", false);
  }
  $("#disclaimerAgreement").css("border-color", "transparent");
  $("#account").css("border-color", "transparent");
  $("#keyInput").css("border-color", "#EEEEEE");
  
  dimBackground();
  $("#login").css("display", "block");
  $("#login").focus();
  
  // Fix layout
  // bottom of form - padding - top of the info box - margin between info box and checkbox - checkbox height
  $("#loginDisclaimer").css("height", $("#login").offset().top+$("#login").outerHeight()-$("#loginContents").position().top/2 -$("#loginDisclaimer").offset().top-($("#disclaimerAgreement").offset().top-($("#loginDisclaimer").offset().top+$("#loginDisclaimer").outerHeight()))-$("#disclaimerAgreement").outerHeight());
  
  //failedLogin = false;
}

// Hide the login window
function hideLogin() {
  undimBackground();
  $("#login").css("display", "none");
  if($("#newAccountField").html()!="<input id='newAccountSubmit' name='newAccountSubmit' type='submit' value='Create New Account' />") {
    $("#newAccountField").html("<input id='newAccountSubmit' name='newAccountSubmit' type='submit' value='Create New Account' />");
    $("#newAccountSubmit").on("click", function() { createAccount(); });
  }
}

// Logout and clear state variables; account address will update in loadAccount which clears the cookie as well 
function logout() {
  $("#keyInput").val("");
  $("#accountInput").val("");
  $("#account").val("");
  $("#keyInput").prop("placeholder", "Can be left blank for read-only mode.");
  key="";
  holdings = {};
  holdings[baseCurrency]=0;
  loadAccount();
  getDisplayName();
  hideLogin();
}

// Login and check validity of secret key + address combination.  Works offline!
function saveLogin() {
  if(loggingIn) return;
  else loggingIn = true; // Avoid logging in twice if the user keeps clicking
  if($("#disclaimerRead").prop("checked")==true) {
  
    // Assume invalid by default
    var validKey = false;
    var error = "<br />Check and re-enter your secret key.";
    
    try {
      // Allow read-only mode if left blank
      if($("#keyInput").val()=="") {
        validKey = true;
        saveLogin2(validKey, error);
      }
      
      // Otherwise analyze it
      else {
        // Custom-modded ripplelib to expose deriveKeypair for checking validity of the secret + address
        var pair = api.deriveKeypair($("#keyInput").val());
        if(pair) {
        
          // Address is derived from the public key which is derived from the secret key
          // Make sure it matches the address the user input
          var publicKey = pair.publicKey;
          //console.log("Key pair for secret given: "+pair.publicKey+" / "+pair.privateKey);
          
          // If account field is blank, we can just generate it from the secret key (technically only the secret is needed)
          if($("#accountInput").val()=="") $("#accountInput").val(api.deriveAddress(publicKey));
          
          // Else check against what they put
          if(api.deriveAddress(publicKey)==$("#accountInput").val()) {
            validKey = true;
            saveLogin2(validKey, error);
          }
          else { 
            // if we get here, it means the secret is valid but secret key doesn't match the account account
            
            console.log("Secret key failed.");
            
            // Check if it's the RegularKey instead by first looking up the RegularKey setting of the account
            api.getSettings($("#accountInput").val()).then(function(receivedSettings) {
              if("regularKey" in receivedSettings) {
                console.log("Checking against additional regularKey: "+receivedSettings["regularKey"]);
                
                // Redo the check against the RegularKey
                if(api.deriveAddress(publicKey)==receivedSettings["regularKey"]) {
                  validKey = true;
                  console.log("RegularKey matched.");
                }
              }
              // No regular key found
              else {
                console.log("No additional regularKey to check against: ");
                console.log(receivedSettings);
              }
            }, function(err) { console.log("Error getting account settings: "+err); }).then(function() {
              // If other misc errors come up, such as API errors
              saveLogin2(validKey, error);
            });
          }
        }
      }
    }
    catch (ex) { // invalid secret key format
      error = "<br />"+ex;
      saveLogin2(validKey, error);
    }
  }
  else {
    // Disclaimer box unchecked
    $("#disclaimerAgreement").css("border-color", "red");
    loggingIn = false;
  }
}

// Proceed to login and update state variables
function saveLogin2(validKey, error) {
  if(validKey //|| failedLogin
  ) {
    $("#account").val($("#accountInput").val());
    // Update and save the account address immediately here, forgot why but something to do with it needing to be used instantly
    address = $("#accountInput").val();
    Cookies.set('accountAddr', address, { expires: 7 });
    $("#miscMenu").html(""); // force a rebuild of the account menu
    console.log("Account address saved to cookie: "+address);
    var tempKey = $("#keyInput").val();
    if(tempKey) key = tempKey;
    $("#keyInput").val("");
    if(key) $("#keyInput").prop("placeholder", "-- Secret Key Hidden --");
    else $("#keyInput").prop("placeholder", "-- None key entered. Read-only mode. --");
    holdings = {};
    holdings[baseCurrency]=0;
    loadAccount();
    getSettings();
    getDisplayName();
    hideLogin();
    console.log("Login succeeded.");
    //if(failedLogin) $("#errors").html("Forcing use of invalid secret key. Continue at your own risk.");
  }
  else {
    $("#newAccountField").html("Error: Secret key is invalid or doesn't match account."+error);
    $("#keyInput").css("border-color", "red");
    $("#keyInput").prop("placeholder", "Can be left blank for read-only mode.");
    console.log("Login failed: "+error);
    //failedLogin = true;
  }
  loggingIn = false;
}

// General informational popups
function showPopup(text, header) {
  $("#popupHeader").html(header);
  $("#popupText").html(text);
  dimBackground();
  $("#popup").css("display", "block");
  $("#popup").focus();
  
  // fix layout
  $("#popupText").css("height", $("#popup").outerHeight()-$("#okPopup").outerHeight()-$("#popupContents").position().top*2-$("#popupText").position().top);
}

function hidePopup() {
  undimBackground();
  $("#popup").css("display", "none");
}

// Clicking on the issuer link to change it
function showIssuer1() {
  $("#backerSubmit1").css("display", "inline");
  showIssuer(symbol1, issuer1);
}

// Informational if it's you
function showIssuerYou() {
  showPopup($("#issuerInfo").html(), "What does it mean to issue a token?");
}

function showIssuer2() {
  $("#backerSubmit2").css("display", "inline");
  showIssuer(symbol2, issuer2);
}

// Window to change the issuer for a symbol
function showIssuer(symbol, issuer) {
  $("#issuerInput").val(issuer);
  $("#symbolToBeBacked").html(symbol);
  var issuerList = $("#issuerList");
  issuerList.empty();
  issuerList.append($("<option />").val("").text("-- None --"));
  if(symbol in issuers) {
    $.each(issuers[symbol], function() {
        issuerList.append($("<option />").val(this).text(getIssuerName(this)));
    });
    sortDropDownListByText("issuerList");
    if($.inArray(issuer, issuers[symbol])>-1) issuerList.val(issuer);
  }
  
  dimBackground();
  $("#backer").css("display", "block");
  $("#backer").focus();
  
  // Fix layout
  $("#issuerInfo").css("height", $("#backer").offset().top+$("#backer").outerHeight()-$("#issuerInfo").offset().top-($("#backerContents").offset().top-$("#backer").offset().top));
}

// Drop-down of known issuers to select based on the symbol
function sortDropDownListByText(selectId) {
    var foption = $('#'+ selectId + ' option:first');
    var soptions = $('#'+ selectId + ' option:not(:first)').sort(function(a, b) {
       return a.text == b.text ? 0 : a.text < b.text ? -1 : 1;
    });
    $('#' + selectId).html(soptions).prepend(foption);              

}

// Hide the issuer selection window
function hideIssuer() {
  undimBackground();
  $("#backer").css("display", "none");
  $("#backerSubmit1").css("display", "none");
  $("#backerSubmit2").css("display", "none");
  updateSymbols();
}

// Save the issuer
function saveIssuer1() {
  issuer1 = $("#issuerInput").val();
  refreshImmediately = true;
  hideIssuer();
}

function saveIssuer2() {
  issuer2 = ($("#issuerList").val()? $("#issuerList").val():$("#issuerInput").val());
  refreshImmediately = true;
  hideIssuer();
}

// Look up trustlines but not too many; used for startup of the page.  We look up all trustlines later if the user asks for it
function getTrustlines() {
  if(address=="") return true;
  else {
    console.log("Loading trustlines...");
    noDisconnecting = true;
    return api.getTrustlines(address, {limit:10}).then(function(lines) {
        console.log("Finished loading trustlines...");
        console.log(lines);
        noDisconnecting = false;
        return lines;
    }, function (err) { console.log("Error getTrustlines: "+err); noDisconnecting = false; return ""; }).then(function(lines) {
      
      
        console.log("Parsing trustlines...");
        trustlines = {};
        if(address!="" && lines) {
          for(var i = 0; i<lines.length; i++) {
            if(parseFloat(lines[i].specification.limit)==0 && !lines[i].specification.authorized) continue;
            
            // Add trustline issuers to our known issuers list for autocomplete
            if(!(lines[i].specification.currency in trustlines)) trustlines[lines[i].specification.currency] = {};
            trustlines[lines[i].specification.currency][lines[i].specification.counterparty] = {limit:parseFloat(lines[i].specification.limit), ripplingDisabled:lines[i].specification.ripplingDisabled};

            if(!(lines[i].specification.currency in issuers)) issuers[lines[i].specification.currency] = [];
            if(issuers[lines[i].specification.currency].indexOf(lines[i].specification.counterparty)<0) issuers[lines[i].specification.currency].push(lines[i].specification.counterparty);
            
          }
          
          // Update autocomplete if needed
          var symbolsList = symbolLister();
          $("#symbol1").autocomplete({ source:symbolsList});
          $("#symbol2").autocomplete({ source:symbolsList});
        }
        
      return true;
      
    }, function(er) { console.log("Error compiling trustlines: "+er); return true; });
  }
}

// Show trustlines window, which becomes Receivable Tokens or Authorized Holders depending if you have the requireAuthorization flag (can't be both)
function showTrustlines() {
  if(address=="") loginWarning();
  else {
    if(settings["requireAuthorization"]) {
      $("#trustlinesTitle").html("Set Authorized Token Holders");
      $("#trustlinesField").html("Allow Sending");
      //$("#trustlinesField").html("");
      $("#trustlinesAddress").html("Token Holder");
      $("#trustlinesInfo").css("display", "none");
      $("#authorizedInfo").css("display", "block");
    }
    else {
      $("#trustlinesTitle").html("Set Receivable Tokens");
      $("#trustlinesField").html("Limit");
      $("#trustlinesAddress").html("Issuer");
      $("#trustlinesInfo").css("display", "block");
      $("#authorizedInfo").css("display", "none");
    }
    noDisconnecting = true;
    $("#errors").html("Loading trustlines...");
    api.getTrustlines(address).then(function(lines) {
        console.log("Finished loading trustlines...");
        console.log(lines);
        noDisconnecting = false;
        return lines;
    }, function (err) { console.log("Error getTrustlines: "+err); noDisconnecting = false; return ""; }).then(function(lines) {
      
      console.log("Parsing trustlines...");
      trustlines = {};
      if(address!="" && lines) {
        for(var i = 0; i<lines.length; i++) {
          if(parseFloat(lines[i].specification.limit)==0 && !lines[i].specification.authorized) continue;
          
          // Again add any trustlines to known issuers for autocomplete
          if(!(lines[i].specification.currency in trustlines)) trustlines[lines[i].specification.currency] = {};
          trustlines[lines[i].specification.currency][lines[i].specification.counterparty] = {limit:parseFloat(lines[i].specification.limit), ripplingDisabled:lines[i].specification.ripplingDisabled};
          
          if(!(lines[i].specification.currency in issuers)) issuers[lines[i].specification.currency] = [];
          if(issuers[lines[i].specification.currency].indexOf(lines[i].specification.counterparty)<0) issuers[lines[i].specification.currency].push(lines[i].specification.counterparty);
        }
        
        // Update autocomplete list if needed
        var symbolsList = symbolLister();
        $("#symbol1").autocomplete({ source:symbolsList});
        $("#symbol2").autocomplete({ source:symbolsList});
      }

      
      }, function(er) { console.log("Error compiling trustlines: "+er); }).then(function(lines) {
      
        console.log("Building trustlines table...");
        $("#trustlinesTable").find("tr:gt(0)").remove();
        
        var symbols = [];
        for(var symbol in trustlines)
          if($.inArray(symbol, symbols) === -1) symbols.push(symbol);
        symbols.sort();
        
        var n = 0;
        for(var i=0; i<symbols.length; i++) {
          var backers = [];
          for(var backer in trustlines[symbols[i]])
            if($.inArray(backer, backers) === -1) backers.push(backer);
          backers.sort(function(a,b) {
              return  getIssuerName(a) - getIssuerName(b);
          });
          for(var j=0; j<backers.length; j++) {
            if(trustlines[symbols[i]][backers[j]].limit>=0) {
              $('#trustlinesTable').append("<tr id='trustrow"+n+"'><td id='trustSymbol"+n+"' class='trustSymbol'><div><input type='text' readonly='readonly' id='trustedSymbol"+n+"' name='trustedSymbol"+n+"' value='"+symbols[i]+"' style='opacity:.6;'  /></div></td><td id='trustIssuer"+n+"' class='trustIssuer'><div><input type='text' readonly='readonly' id='trustedIssuer"+n+"' name='trustedIssuer"+n+"' value='"+backers[j]+"' style='opacity:.6;' /></div></td><td id='trustLimit"+n+"' class='trustLimit'><div>"+(settings["requireAuthorization"]? "<input type='hidden' id='approved"+n+"' name='approved"+n+"' value='true' />"+"<input type='checkbox' id='allowTransfer"+n+"' name='allowTransfer"+n+"' "+(!trustlines[symbols[i]][backers[j]].ripplingDisabled? "checked='checked'":"")+" />":"<input type='number' id='limit"+n+"' name='limit"+n+"' value='"+trustlines[symbols[i]][backers[j]].limit+"' />")+"</div></td><td id='trustDelete"+n+"' class='trustDelete'><div><a href='#' onclick='$(\"#trustrow"+n+"\").css(\"background-color\", \"#FF0000\"); $(\"#allowTransfer"+n+"\").prop(\"checked\", false); if(settings[\"requireAuthorization\"]) $(\"#approved"+n+"\").val(\"false\"); else $(\"#limit"+n+"\").val(0);'>[X]</a></div></td></tr>");
              replaceTrustedAddressWithName("trustIssuer"+n, "trustedIssuer"+n, backers[j]);
            }
            n++;
          }
        }
        
        if($('#trustlinesTable tr').length<=1) addTrustline();
        
        console.log("Finished trustlines table...");
        dimBackground();
        $("#trustlines").css("display", "block");
        $("#trustlines").focus();
        $("#errors").html("&nbsp;");
        
        // Fix layout
        $("#trustlinesInfo").css("height", $("#trustlines").outerHeight()+$("#trustlines").offset().top-$("#trustlinesInfo").offset().top-($("#trustlinesContents").offset().top-$("#trustlines").offset().top));
        $("#authorizedInfo").css("height", $("#trustlines").outerHeight()+$("#trustlines").offset().top-$("#authorizedInfo").offset().top-($("#trustlinesContents").offset().top-$("#trustlines").offset().top));
        
     }, function(err) { console.log("Error loading trustlines: "+err); });
  }
}

// Replace address text with issuer's name if we know it
function replaceTrustedAddressWithName(container, id, address) {
  if(getIssuerName(address)!=address) {
    $("#"+container).html("<div><input type='hidden' id='"+id+"' name='"+id+"' value='"+address+"' /><input type='text' id='display"+id+"' readonly='readonly' name='display"+id+"' value='"+getIssuerName(address)+"' style='opacity:.6;' /></div>");
    $("#display"+id).on("click", function() {
        replaceTrustedNameWithAddress(container, id, address);
    });
  }
}

// Switch the issuer's name back to their address
function replaceTrustedNameWithAddress(container, id, address) {
  $("#"+container).html("<div><input type='text' id='"+id+"' readonly='readonly' name='"+id+"' placeholder='Issuer Address...' value='"+address+"' style='opacity:.6;' /></div>");
  $("#"+id).on("click", function() {
      replaceTrustedAddressWithName(container, id, address);
  });
}

// Add row for inputting a new trustline
function addTrustline() {
  var n = $('#trustlinesTable tr').length-1;
  $('#trustlinesTable tr:last').after("<tr><td  id='trustSymbol"+n+"' class='trustSymbol'><input type='text' id='trustedSymbol"+n+"' name='trustedSymbol"+n+"' placeholder='Symbol Name...' value='' /></td><td id='trustIssuer"+n+"' class='trustIssuer'><input type='text' id='trustedIssuer"+n+"' name='trustedIssuer"+n+"' placeholder='"+(settings["requireAuthorization"]? "Holder Address":"Issuer Address")+"...' value='' /></td><td id='trustLimit"+n+"' class='trustLimit'>"+(settings["requireAuthorization"]? "<input type='hidden' id='approved"+n+"' value='true' />"+"<input type='checkbox' id='allowTransfer"+n+" name='allowTransfer"+n+"' />":"<input type='number' id='limit"+n+"' name='limit"+n+"' value='0' />")+"</td></tr>");
  $('#trustlinesBox').scrollTop($('#trustlinesBox')[0].scrollHeight);
  $("#trustedSymbol"+n).on("change", function (e) {
    var temp = $("#trustedSymbol"+n).val().toUpperCase();
    $("#trustedSymbol"+n).val(temp);
    var existingIssuer = $("#trustedIssuer"+n).val();
    if(!settings["requireAuthorization"] && temp.length>0) {
      if(temp in issuers) {
        var selectMenu = "<select id='trustedIssuer"+n+"' name='trustedIssuer"+n+"'>";
        for(var i=0; i<issuers[temp].length; i++)
          selectMenu+="<option value='"+issuers[temp][i]+"'>"+getIssuerName(issuers[temp][i])+"</option>";
        selectMenu+="</select>";
        $("#trustIssuer"+n).html(selectMenu);
        sortDropDownListByText("trustedIssuer"+n);
        $("#trustedIssuer"+n).val(existingIssuer==""? issuers[temp][0]:existingIssuer);
        $("#trustedIssuer"+n).append($("<option />").val("-").text("-- Enter Address Manually --"));
        $("#trustedIssuer"+n).on("change", function() {
          if($("#trustedIssuer"+n).val()=="-")
            $("#trustIssuer"+n).html("<input type='text' id='trustedIssuer"+n+"' name='trustedIssuer"+n+"' placeholder='"+(settings["requireAuthorization"]? "Holder Address":"Issuer Address")+"...' value='' />");
        });
      }
      else $("#trustIssuer"+n).html("<input type='text' id='trustedIssuer"+n+"' name='trustedIssuer"+n+"' placeholder='"+(settings["requireAuthorization"]? "Holder Address":"Issuer Address")+"...' value='"+existingIssuer+"' />");
    }
  });
}

// Save trustlines - can only do one at a time, so we need a loop
function saveTrustlines() {
  hideTrustlines();
  if(address=="" || key=="") loginWarning();
  else {
    $("#errors").html("&nbsp;");
    showPopup("Updating "+(settings["requireAuthorization"]? "authorized token holders":"receivable tokens")+"...", "Updating "+(settings["requireAuthorization"]? "Authorized Token Holders":"Receivable Tokens")+"...");
    updateTrustline(0);
  }
}

// Loop through each trustline update one at a time, by requirement of the Ripple API
function updateTrustline(i, updated) {
  if(updated===undefined || updated =='undefined') updated = false;
  if(address!="" && key!="") {
  
    var n = $('#trustlinesTable tr').length-1;
    var hasUpdates = false;
    var symbol = "";
    var issuer = "";
    var limit = 0;
    var approved = true;
    var ripplingDisabled = true;
    while(i<n) {
      symbol = $("#trustedSymbol"+i).val();
      issuer = $("#trustedIssuer"+i).val();
      if(symbol=="" || issuer == "" ) continue;
      try {
        limit = settings["requireAuthorization"]? 0:parseFloat($("#limit"+i).val());
        if(settings["requireAuthorization"] && !$("#allowTransfer"+i).prop("checked")) ripplingDisabled = false;
      }
      catch(ex) { console.log("Error reading limit for "+symbol+" / "+issuer+": "+ex); limit = 0; }
      if(settings["requireAuthorization"]) approved = $("#approved"+i).val()=="true";
      else approved = false;
      if(!(symbol in trustlines) || !(issuer in trustlines[symbol]) || limit!=trustlines[symbol][issuer].limit || ripplingDisabled!=trustlines[symbol][issuer].ripplingDisabled || (settings["requireAuthorization"] && approved == false) || (limit==0 && !settings["requireAuthorization"])) {
        hasUpdates = true;
        break;
      }
      i++;
    }
    
    // Issuer name for display purposes
    var backer = issuer;
    if(backer != getIssuerName(backer)) backer = getIssuerName(backer);
    
    // Update the row we found
    if(hasUpdates) $("#popupText").append("<br />Updating "+symbol+" by "+backer+"...");
    // Otherwise end it if we find no rows and hit the end of the line
    else if(i>=n) {
      if(updated) {
        $("#popupText").append("<br />All updates complete. Updates can require a few minutes to take effect.");
        return;
      }
      else {
        $("#popupText").append("<br />No updates to process.  All done.");
        return;
      }
    }
    
    // Build JSON for trustline update
    var line = {currency:symbol, counterparty:issuer, limit:""+limit, authorized:settings["requireAuthorization"]&&approved, ripplingDisabled: ripplingDisabled};
    
    console.log("Saving trustline: ");
    console.log(line);
    
    // All transactions should have higher max thresholds to avoid erroring out during high trading volume
    var options = {};
    options.maxFee = maxFee;
    options.maxLedgerVersionOffset = maxLedgerOffset;
    noDisconnecting = true;
    api.prepareTrustline(address, line, options).then(function(prepared)
    {
        var transaction = "";
        var transactionID = -1;
        try {
          var result = api.sign(prepared.txJSON, key);
          transaction = result.signedTransaction;
          transactionID = result.id;
        }
        catch(er) {
          $("#popupText").append("<br /> - Error signing update for "+symbol+" by "+backer+": "+er);
        }
        
        if(transaction!="") {
          api.submit(transaction).then(function(result) {
            //loadAccount();
            noDisconnecting = false;
            
            // Friendlier messages when we can
            if(result.resultCode=="tesSUCCESS") $("#popupText").append("<br /> - Completed update for "+symbol+" by "+backer+". (See <a href='"+transactionHistoryURL+transactionID+"' target='_blank'>transaction details</a>)");
            else if(result.resultCode=="terQUEUED") $("#popupText").append("<br /> - Update queued due to high load on network. Check back in a few minutes to confirm completion and retry if not.");
            else if(result.resultCode=="tecNO_LINE_INSUF_RESERVE") $("#popupText").append("<br /> - Not enough "+baseCurrency+" held to add new symbol. Min XRP required = 20 base + 5 per additional symbol.  Fund your account with 5 more XRP or remove another symbol to add this one.");
            else $("#popupText").append("<br /> - Error for adding "+symbol+" by "+backer+" ("+result.resultCode+"): "+result.resultMessage+" (See <a href='"+transactionHistoryURL+transactionID+"' target='_blank'>transaction details</a>)");
            
          }, function (err) {
          
            $("#popupText").append("<br /> - Error updating for "+symbol+" by "+backer+": "+err);
            
          }).then(function() {
          
            // Process next row
            updateTrustline(i+1, true);
            
          });
        }
        else noDisconnecting = false;
    }, function (er) {
        $("#popupText").append("<br /> - Error preparing update for "+symbol+" by "+backer+": "+err);
        noDisconnecting = false;
    });
  }
  else {
    loginWarning();
    $("#popupText").append("<br />Invalid account address and secret key combination.");
  }
}

// Hide the trustlines window
function hideTrustlines() {
  undimBackground();
  $("#trustlines").css("display", "none");
}

// Previously wanted to automatically add USD and BTC to all accounts for user convenience, not sure anymore
/*
function defaultTrustlines(itemToSubmit) {
  return;
  if(address!="" && key!="") {
    console.log("Setting default trustlines for new account...");
    var n = 0;
    for(var symbol in majorIssuers) {
      for(var i = 0; i < majorIssuers[symbol].length; i++) {
        
        if(n==itemToSubmit && majorIssuers[symbol][i]!="undefined" && (!(symbol in trustlines) || !(majorIssuers[symbol][i] in trustlines[symbol]))) {
          
          var qty = 9999999999;
          
          var line = {currency:symbol, counterparty:majorIssuers[symbol][i], limit:""+qty, ripplingDisabled:true};
          
          var options = {};
          options.maxFee = maxFee;
          options.maxLedgerVersionOffset = maxLedgerOffset;
          noDisconnecting = true;
          api.prepareTrustline(address, line, options).then(function(prepared)
          {
              var transaction = "";
              var transactionID = -1;
              try {
                var result = api.sign(prepared.txJSON, key);
                transaction = result.signedTransaction;
                transactionID = result.id;
              }
              catch(er) {
                console.log("Error setting default trustline: "+er);
              }
              
              if(transaction!="") {
                console.log("Adding trust for "+symbol+" by "+majorIssuers[symbol][i]+"...");
                api.submit(transaction).then(function(result) {
                  //loadAccount();
                  
                  if(result.resultCode=="tesSUCCESS")
                   { }
                  else {
                    console.log("Error setting default trustline for "+symbol+" by "+majorIssuers[symbol][i]+": "+result.resultMessage);
                  }
                }, function (err) {
                  console.log("Error setting default trustline for "+symbol+" by "+majorIssuers[symbol][i]+": "+err);
                }).then(function() {
                  noDisconnecting = false;
                  defaultTrustlines(itemToSubmit+1);
                }, function(err) { console.log("Error defaultTrustlines: "+err); noDisconnecting = false; });
              }
              else noDisconnecting = false;
          });
        }
        
        n++;
      }
    }
  }
}*/

// Pull settings at startup without displaying any windows etc
function getSettings() {
  if(address!="") {
    console.log("Loading settings...");
    noDisconnecting = true;
    return api.getSettings(address).then(function(settingsReceived) {
        console.log("Finished loading settings...");
        console.log(settingsReceived);
        noDisconnecting = false;
        
        try {
          for(var k in defaultSettings) {
            if(k in settingsReceived) settings[k] = settingsReceived[k];
            else if(addedSettings.indexOf(k)<0) settings[k] = defaultSettings[k];
          }
        }
        catch(err) {
          console.log("Error parsing settings: "+err);
        }
        
        return true;
     }, function (err) { console.log("Error getSettings: "+err); noDisconnecting = false; return true; });
   }
   else return true;;
}

// Advanced settings window, read-only if no secret key
function showSettings() {
  if(address=="") loginWarning();
  else {
    console.log("Loading settings...");
    noDisconnecting = true;
    api.getSettings(address).then(function(settingsReceived) {
        console.log("Finished loading settings...");
        console.log("Loaded: ");
        console.log(settingsReceived);
        noDisconnecting = false;
        
        try {
          for(var k in defaultSettings) {
            if(k in settingsReceived) settings[k] = settingsReceived[k];
            else if(addedSettings.indexOf(k)<0) settings[k] = defaultSettings[k];
          }
        }
        catch(err) {
          console.log("Error parsing settings: "+err);
        }
        
        console.log("Building settings table...");
        $("#settingsTable").find("tr:gt(0)").remove();

        console.log("Printing: ");
        console.log(settings);
        var n = 0;
        for(var k in settings) {
            $('#settingsTable').append("<tr><td class='settingName'><input type='text' readonly='readonly' value='"+k+"' /></td><td class='settingValue'><div>"+(k in stringSettings? "<input type='text' id='setting_"+k+"' name='setting_"+k+"' value='"+(settings[k]==null? "":settings[k])+"' placeholder='"+stringSettings[k]+"' />":"<input type='checkbox' id='setting_"+k+"' name='setting_"+k+"' "+(settings[k]? "checked='checked'":"")+"' />")+"</div></td></tr>");
            n++;
        }
        
        console.log("Finished settings table...");
        dimBackground();
        $("#settings").css("display", "block");
        $("#settings").focus();
        $("#errors").html("&nbsp;");
        
        // Fix layout
        $("#settingsInfo").css("height", $("#settings").outerHeight()+$("#settings").offset().top-$("#settingsInfo").offset().top-($("#settingsContents").offset().top-$("#settings").offset().top));
        
    }, function (err) { $("#errors").html("Account needs to be funded with a <a href='#started' onclick='$(\"#about\").css(\"display\", \"block\"); jQuery(\"html,body\").animate({scrollTop: jQuery(\"#started\").offset().top}, 1000); setURL(\"#started\"); return false;'>minimum "+minBaseCurrency.toString()+" "+baseCurrency+"</a> before it can be configured."); errored=true; noDisconnecting = false; refreshLayout(); });
  }
}

// Save advanced settings.  Similar to trustlines, can only save one at a time.
function saveSettings() {
  if(address!="" && key!="") {
    // build list of settings to update
    var submittedSettings = [];
    for(var k in settings) {
      if(k in stringSettings) {
        if($("#setting_"+k).val()!="" && settings[k]!=$("#setting_"+k).val()) {
          settings[k] = $("#setting_"+k).val();
          submittedSettings.push(k);
        }
        else if(settings[k]!=null && $("#setting_"+k).val()=="") {
          settings[k] = null;
          submittedSettings.push(k);
        }
      }
      else {
        if(settings[k]!=$("#setting_"+k).prop("checked")) {
          settings[k] = $("#setting_"+k).prop("checked");
          submittedSettings.push(k);
        }
      }
    }
    hideSettings();
    
    showPopup("Saving settings...", "Saving Settings...");
    console.log("Total settings to save: ");
    console.log(settings);
    if(submittedSettings.length==0) {
      $("#popupText").append("<br />No settings to update.");
    }
    else {
      // Iterate through list of updated settings
      saveSetting(submittedSettings, 0);
    }
  }
  else {
    // Kick out to main page with login message if no secret key
    hideSettings();
    loginWarning();
  }
}

// Saving each setting one at a time.
function saveSetting(submittedSettings, i) {
  if(i>=submittedSettings.length) {
      
      // End of loop
      $("#popupText").append("<br />All settings finished saving.  New settings can require a few minutes to take effect.");
      
      // if defaultRipple updated, update all trustlines to enable rippling
      if(submittedSettings.indexOf("defaultRipple")>=0) {
        updateRippling1(settings["defaultRipple"]);
      }
      
      getSettings();
        
  }
  else if(addedSettings.indexOf(submittedSettings[i])>=0) {
    // not to be saved on Ripple
      
      if(submittedSettings[i]=="rippleServer") {
        $("#popupText").append("<br />Switching server used to connect to Ripple to: "+settings["rippleServer"]);
          selectServer(settings["rippleServer"]);
          reconnecting = true;
          api.disconnect().then(function () {
            console.log("Disconnected in saveSetting.");
            return api.connect();
          }, function  (err) {
            console.log("Failed to disconnect in saveSetting: "+err);
          }).then(function () {
            console.log("Reconnected in saveSetting.");
          }, function (err) {
            console.log("Failed to reconnect in saveSetting: "+err);
          }).then( function () {
            reconnecting = false;
            // Iterate to next setting to update
            saveSetting(submittedSettings, i+1);
          });
      }
  }
  else {
    noDisconnecting = true; // disable periodic disconnects/reconnects for connection refresh
    try {
      $("#popupText").append("<br />Saving "+submittedSettings[i]+" settings = "+settings[submittedSettings[i]]);
      console.log("Saving "+submittedSettings[i]+" settings = "+settings[submittedSettings[i]]);
      var singleSetting = { };
      singleSetting[submittedSettings[i]] = settings[submittedSettings[i]];
      
      api.prepareSettings(address, singleSetting).then(function(prepared) {
          var transaction = "";
          var transactionID = -1;
          try {
            var result = api.sign(prepared.txJSON, key);
            transaction = result.signedTransaction;
            transactionID = result.id;
          }
          catch(er) {
            errored = true;
            $("#popupText").append("<br /> - Error signing settings update: "+er);
            refreshLayout();
          }
          
          if(transaction!="") {
            api.submit(transaction).then(function(result) {
              errored = true; // Set to true to avoid refresh loop from clearing
              
              // Friendlier messages
              if(result.resultCode=="tesSUCCESS")
                $("#popupText").append("<br /> - "+submittedSettings[i]+" setting saved.");
              else if(result.resultCode=="terQUEUED") $("#popupText").append("<br /> - Update queued due to high load on network. Check back in a few minutes to confirm completion and retry if not.");
              else if(result.resultCode=="tecOWNERS") $("#popupText").append("<br /> - You must remove all orderbook offers and clear your Receivable Tokens list before enabling requireAuthorization.");
              else $("#popupText").append("<br /> - Error for saving "+submittedSettings[i]+" setting ("+result.resultCode+"): "+result.resultMessage);
              noDisconnecting = false; // allow periodic disconnects/reconnects to refresh connection
              
            }, function (err) {
              errored = true; // Set to true to avoid refresh loop from clearing
              $("#popupText").append("<br /> - Error saving "+submittedSettings[i]+" setting: "+err);
              noDisconnecting = false;
            }).then(function() {
              // Iterate to next setting to update
              saveSetting(submittedSettings, i+1);
            });
          }
          else noDisconnecting = false; // re-enable periodic disconnects/reconnects to refresh connection
      }, function(err) {
          errored = true; // Set to true to avoid refresh loop from clearing
          $("#popupText").append("<br />Error saving "+submittedSettings[i]+" setting: "+err); 
          noDisconnecting = false; // re-enable periodic disconnects/reconnects to refresh connection
      });
    }
    catch(exx) {
      errored = true; $("#popupText").append("<br />Error updating "+submittedSettings[i]+" setting: "+exx); noDisconnecting = false; 
    }
  }
}

// Hide advanced settings window
function hideSettings() {
  undimBackground();
  $("#settings").css("display", "none");
}

// Pull latest memos sent to namesWallet as displayName of the sender
function getDisplayName(addressRequest) {
  if(addressRequest===undefined || addressRequest=='undefined' || addressRequest=="") {
    addressRequest = address;
  }
  
  if(addressRequest!="")
    displayName[addressRequest] = "";
  
  if(addressRequest=="") {
    displayName[addressRequest] = "";
    return new Promise(function(resolve, reject) { resolve(); });
  }
  
  else { 
  
    var options = {counterparty:addressRequest, earliestFirst:false, initiated:false, limit:1, types:["payment"]};
    console.log("Retrieving Ripple Display Name for "+addressRequest+"...");
    
    return new Promise(function(resolve, reject) { 
      try {
        if(namesAPI.isConnected()) {
          resolve();
        }
        else {
          console.log('Disconnected in getDisplayName.');
          try {
            namesAPI.connect().then(function() {
                console.log("Reconnected in getDisplayName.");
                resolve();
            }, function (err) {
              console.log("Failed to reconnect in getDisplayName: "+err);
              resolve();
            });
          }
          catch (er) {
            console.log("Failed to reconnect in getDisplayName: "+er);
            resolve();
          }
        }
      }
      catch (erx) {
        console.log("Error in getDisplayName API connect: "+erx);
        resolve();
      }
    }, function(er) { console.log("Error in getDisplayName reconnection: "+er); return null; }).then(function() {
      
      // Retrieve transactions of the names wallet as names storage
      if(namesAPI.isConnected())
        return namesAPI.getTransactions(namesWallet, options );
      else return null;
      
    }, function(err) { console.log("Error retrieving transactions from names server: "+err); return null; })
    .then(function (transactions) {
      if(transactions!=null && transactions.length>0 && transactions[0].address == addressRequest && transactions[0].specification!=null && transactions[0].specification.memos[0].data!=null) {
        
        var d = new Date(transactions[0].outcome.timestamp); // date
        var m = stripHTML(transactions[0].specification.memos[0].data); // name
        console.log("Ripple Display Name retrieved: "+m +" ("+d+")");
        
        if(!(m in displayNameDetails)) { // if there is no one else with the name, take it
          console.log("- Ripple Display Name set: "+m+" for "+addressRequest+" on "+d);
          displayName[addressRequest] = m;
          displayNameDetails[m] = {date: d, address:addressRequest};
        }
        else if(displayNameDetails[m].address==addressRequest || displayNameDetails[m].date>d) { // otherwise take it only if you had it first
          console.log("- Ripple Display Name removed from: "+displayNameDetails[m].address+" ("+d+")");
          displayName[displayNameDetails[m].address] = ""; // kick out the other guy who has the name
          if(displayNameDetails[m].address==address) printDisplayName();
          displayName[addressRequest] = m;
          displayNameDetails[m] = {date: d, address:addressRequest};
        }
        
      }
    }, function(err) {
      console.log("Display name retrieval error: "+err);
    }).then(function () {
      if(addressRequest==address) printDisplayName();
    });
  }
}

// Pull full history of Display Names - sounds slow but might be faster if pulling many in bulk instead of one at a time
function getAllDisplayNames(exitFunction, startIndex) {
  
  var options = {earliestFirst:true, initiated:false, limit:100, types:["payment"]};
  if(startIndex!=undefined && startIndex!='undefined' && startIndex!='') options.start=startIndex;
  console.log("Retrieving All Ripple Display Names...");
  
  return new Promise(function(resolve, reject) { 
    try {
      if(namesAPI.isConnected()) {
        resolve();
      }
      else {
        console.log('Disconnected in getAllDisplayNames.');
        try {
          namesAPI.connect().then(function() {
              console.log("Reconnected in getAllDisplayNames.");
              resolve();
          }, function (err) {
            console.log("Failed to reconnect in getAllDisplayNames: "+err);
            resolve();
          });
        }
        catch (er) {
          console.log("Failed to reconnect in getAllDisplayNames: "+er);
          resolve();
        }
      }
    }
    catch (erx) {
      console.log("Error in getAllDisplayNames API connect: "+erx);
      resolve();
    }
  }, function(er) { console.log("Error in getDisplayName reconnection: "+er); return null; }).then(function() {
    
    // Retrieve transactions of the names wallet as names storage
    if(namesAPI.isConnected())
      return namesAPI.getTransactions(namesWallet, options );
    else return null;
    
  }, function(err) { console.log("Error retrieving transactions from names server: "+err); return null; })
  .then(function (transactions) {
    if(transactions!=null && transactions.length>0) {
      for(var i=0; i<transactions.length; i++) {
        if(transactions[i].id==startIndex) continue;
        else startIndex = transactions[i].id;
        if(transactions[i].specification!=null && transactions[i].specification.memos!=null &&  transactions[i].specification.memos[0].data!=null) 
        {
        
          var d = new Date(transactions[i].outcome.timestamp); // date
          var m = stripHTML(transactions[i].specification.memos[0].data); // name
          var addressRequest = transactions[i].address;
          console.log("Ripple Display Name retrieved: "+m +" ("+d+") for "+transactions[0].address);
          
          if(!(m in displayNameDetails)) { // if there is no one else with the name, take it
            console.log("- Ripple Display Name set: "+m+" for "+addressRequest+" on "+d);
            displayName[addressRequest] = m;
            displayNameDetails[m] = {date: d, address:addressRequest};
          }
          else if(displayNameDetails[m].address==addressRequest || displayNameDetails[m].date>d) { // otherwise take it only if you had it first
            console.log("- Ripple Display Name removed from: "+displayNameDetails[m].address+" ("+d+")");
            displayName[displayNameDetails[m].address] = ""; // kick out the other guy who has the name
            if(displayNameDetails[m].address==address) printDisplayName();
            displayName[addressRequest] = m;
            displayNameDetails[m] = {date: d, address:addressRequest};
          }
        }
      }
      if(transactions.length>=options.limit)
        getAllDisplayNames(exitFunction, startIndex); // get next batch if this one was full
      else exitFunction();
    }
  }, function(err) {
    console.log("Display name retrieval error: "+err);
  });
}

function printDisplayName() {
  if(!(address in displayName)) displayName[address] = "";
  $("#displayName").html(displayName[address]!=""? displayName[address]:"&lt; Click Here to Set &gt;");
  $("#displayNameInput").val(displayName[address]);
}

// Link display name field to input form
function showDisplayName() {
  if(address=="" || key=="") loginWarning();
  else {
    $("#errors").html("Retrieving Ripple Display Name settings...");
    $("#setDisplayNameError").html("");
    getDisplayName().then(function() {
      printDisplayName();
      
      dimBackground();
      $("#setDisplayName").css("display", "block");
      $("#setDisplayName").focus();
      $("#errors").html("&nbsp;");
      
      // Fix layout
      $("#setDisplayNameInfo").css("height", $("#setDisplayName").outerHeight()+$("#setDisplayName").offset().top-$("#setDisplayNameInfo").offset().top-($("#setDisplayNameContents").offset().top-$("#setDisplayName").offset().top));
      
    });
  }
}

function saveDisplayName() {
  var displayNameInput = stripHTML($("#displayNameInput").val());

  if(displayNameInput in displayNameDetails && displayNameDetails[displayNameInput].address!=address) {
    $("#setDisplayNameError").html("Error: This name is already in use.");
  }
  else 
  {
    $("#setDisplayNameError").html("");

    undimBackground();
    $("#setDisplayName").css("display", "none");
    
    showPopup("Submitting Ripple Display Name to the Ripple network...", "Saving Ripple Display Name...");
    noDisconnecting = true; // disable periodic disconnects/reconnects for connection refresh
    try {
      $("#popupText").append("<br />- "+displayNameInput);
      console.log("Saving Ripple Display Name = "+displayNameInput);
      var payment = {};
      payment.source = {};
      payment.source.address = address;
      payment.source.maxAmount = {};
      payment.source.maxAmount.value = ""+0.000001;
      payment.source.maxAmount.currency = baseCurrency;
      
      payment.destination = {};
      payment.destination.address = namesWallet;
      payment.destination.amount = {};
      payment.destination.amount.value = ""+0.000001;
      payment.destination.amount.currency = baseCurrency;
      
      // Add the chat message
      payment.memos = [{data:displayNameInput}];

      console.log(payment);
      
      // Always need to overestimate ledgeroffset and maxfee, else we error out during high traffic
      var options = {};
      options.maxFee = maxFee;
      options.maxLedgerVersionOffset = maxLedgerOffset;
      noDisconnecting = true;
      api.preparePayment(address, payment, options).then(function(prepared)
        {
        
          var transaction = "";
          var transactionID = -1;
          try {
            var result = api.sign(prepared.txJSON, key);
            transaction = result.signedTransaction;
            console.log(transaction);
            transactionID = result.id;
          }
          catch(er) {
            errored = true;
            $("#popupText").append("<br />- Error signing transaction to save Ripple Display Name: "+er);
            console.log("Error signing transaction to save Ripple Display Name: "+er);
          }
          
          if(transaction!="") {
            
            api.submit(transaction).then(function(result) {
              errored = true;
              
              // Friendlier messages
              if(result.resultCode=="tesSUCCESS")
              {
                 $("#popupText").append("<br />- Ripple Display Name saved.");
                 displayName[address] = displayNameInput;
                 displayNameDetails[displayNameInput] = {date:new Date(), address:address};
                 printDisplayName();
              } 
              else if(result.resultCode=="terQUEUED") $("#popupText").append("<br />- Ripple Display Name submission queued due to high traffic. Check back in a few minutes to confirm.");
              else if(result.resultCode=="tecINSUF_RESERVE_OFFER") $("#popupText").append("<br />- Ripple Display Name not submitted due to insufficient "+baseCurrency+". Every message costs at least a fraction of "+baseCurrency+" ("+nFormatter(fee+0.000001, accuracy)+").");
              else $("#popupText").append("<br />- Notice on Ripple Display Name submission ("+result.resultCode+"): "+result.resultMessage+".");
              
              noDisconnecting = false;
            }, function (err) {
              errored = true;
              $("#popupText").append("<br />- Error submitting Ripple Display Name: "+err);
              noDisconnecting = false;
            });
          }
          else noDisconnecting = false;
      }, function (er) {
          errored = true;
          $("#popupText").append("<br />- Error preparing to submit Ripple Display Name: "+err);
          noDisconnecting = false;
      });
    }
    catch(exx) {
      errored = true; $("#popupText").append("<br />- Error saving Ripple Display Name:: "+exx); noDisconnecting = false; 
    }
  }
}

function cancelDisplayName() {
  undimBackground();
  $("#setDisplayName").css("display", "none");
}


// One off call to update defaultRipple
function updateDefaultRipple(enableRippling) {
  if(address!="" && key!="") {
    if(enableRippling) showPopup("Allowing token holders to send to others...", "Allowing Token Holders to Send to Others...");
    else showPopup("Disallowing token holders from sending to others...", "Disallowing Token Holders From Sending to Others...");
    
    noDisconnecting = true; // disable periodic disconnects/reconnects for connection refresh
    try {
      $("#popupText").append("<br />Setting defaultRipple = "+enableRippling);
      var singleSetting = { };
      singleSetting["defaultRipple"] = enableRippling;
      settings["defaultRipple"] = enableRippling;
      
      api.prepareSettings(address, singleSetting).then(function(prepared) {
          var transaction = "";
          var transactionID = -1;
          try {
            var result = api.sign(prepared.txJSON, key);
            transaction = result.signedTransaction;
            transactionID = result.id;
          }
          catch(er) {
            errored = true;
            $("#popupText").append("<br /> - Error signing update to defaultRipple: "+er);
            refreshLayout();
          }
          
          if(transaction!="") {
            api.submit(transaction).then(function(result) {
              errored = true; // Set to true to avoid refresh loop from clearing
              
              // Friendlier messages
              if(result.resultCode=="tesSUCCESS")
                $("#popupText").append("<br /> - defaultRipple setting updated.");
              else if(result.resultCode=="terQUEUED") $("#popupText").append("<br /> - defaultRipple update queued due to high load on network. Check back in a few minutes to confirm completion and retry if not.");
              else $("#popupText").append("<br /> - Error for updating defaultRipple setting ("+result.resultCode+"): "+result.resultMessage);
              noDisconnecting = false; // allow periodic disconnects/reconnects to refresh connection
              
            }, function (err) {
              errored = true; // Set to true to avoid refresh loop from clearing
              $("#popupText").append("<br /> - Error updating defaultRipple setting: "+err);
              noDisconnecting = false;
            }).then(function() {
              // Batch update trustlines in case
              updateRippling1(enableRippling);
            });
          }
          else noDisconnecting = false; // re-enable periodic disconnects/reconnects to refresh connection
      }, function(err) {
          errored = true; // Set to true to avoid refresh loop from clearing
          $("#popupText").append("<br />Error updating defaultRipple setting: "+err); 
          noDisconnecting = false; // re-enable periodic disconnects/reconnects to refresh connection
      });
    }
    catch(exx) {errored = true; $("#popupText").append("<br />Error updating defaultRipple: "+exx); noDisconnecting = false; }
  }
  else {
    loginWarning();
  }
}

// Mass update all trustlines to set rippling
function updateRippling1(enableRippling) {
  $("#popupText").append("<br /><br />Batch updating all trustlines to reflect new defaultRipple setting (permission for token holders to send your token to others).  Please wait...");
  noDisconnecting = true;
  api.getTrustlines(address).then(function(lines) {
    noDisconnecting = false;
    console.log("Finished loading trustlines...");
    if(lines) updateRippling2(enableRippling, lines, 0);
    else $("#popupText").append("<br />No trustlines to update for rippling."); 
  }, function(err) { $("#popupText").append("<br />Error requesting trustlines.  No trustlines updated. "+err); noDisconnection=false; });
}
// Loop through each trustline update one at a time, by requirement of the Ripple API
function updateRippling2(enableRippling, lines, i) {
  if(i>=lines.length) {
    $("#popupText").append("<br />Finished updating all trustlines to set rippling to "+enableRippling+" ("+(enableRippling? "":"not ")+"allowing token holders to send your token to others)."); 
  }
  else if(address!="" && key!="") {
    var symbol = lines[i].specification.currency;
    var backer = lines[i].specification.counterparty;
    $("#popupText").append("<br /> - Setting "+symbol+" / "+backer+" rippling to "+enableRippling+"."); 
    
    // Build JSON for trustline update
    var line = {currency:symbol, counterparty:backer, limit: lines[i].specification.limit, ripplingDisabled: !enableRippling};
    
    // All transactions should have higher max thresholds to avoid erroring out during high trading volume
    var options = {};
    options.maxFee = maxFee;
    options.maxLedgerVersionOffset = maxLedgerOffset;
    noDisconnecting = true;
    api.prepareTrustline(address, line, options).then(function(prepared)
    {
        var transaction = "";
        var transactionID = -1;
        try {
          var result = api.sign(prepared.txJSON, key);
          transaction = result.signedTransaction;
          transactionID = result.id;
        }
        catch(er) {
          $("#popupText").append("<br /> - Error signing rippling update: "+er);
        }
        
        if(transaction!="") {
          api.submit(transaction).then(function(result) {
            //loadAccount();
            noDisconnecting = false;
            
            // Friendlier messages when we can
            if(result.resultCode=="tesSUCCESS") $("#popupText").append("<br /> - Completed rippling update. (See <a href='"+transactionHistoryURL+transactionID+"' target='_blank'>transaction details</a>)");
            else if(result.resultCode=="terQUEUED") $("#popupText").append("<br /> - Rippling update queued due to high load on network. Check back in a few minutes to confirm completion and retry if not.");
            else $("#popupText").append("<br /> - Error for updating rippling setting ("+result.resultCode+"): "+result.resultMessage+" (See <a href='"+transactionHistoryURL+transactionID+"' target='_blank'>transaction details</a>)");
            
          }, function (err) {
            noDisconnecting = false;
            $("#popupText").append("<br /> - Error updating rippling: "+err);
            
          }).then(function() {
          
            // Process next row
            updateRippling2(enableRippling, lines, i+1);
            
          });
        }
        else noDisconnecting = false;
    }, function (er) {
        $("#popupText").append("<br /> - Error preparing rippling update: "+err);
        noDisconnecting = false;
    });
  }
  else {
    loginWarning();
    $("#popupText").append("<br />Invalid account address and secret key combination.");
  }
}

// Destination tag window
function showSendOptions() {
  dimBackground();
  $("#destinationTagInput").val(destTag);
  $("#memoInput").val(memo);
  $("#sendOptionsWindow").css("display", "block");
  $("#sendOptionsWindow").focus();
  
  // Fix layout
  $("#sendOptionsInfo").css("height", $("#sendOptionsWindow").outerHeight()+$("#sendOptionsWindow").offset().top-$("#sendOptionsInfo").offset().top-($("#sendOptionsContents").offset().top-$("#sendOptionsWindow").offset().top));
}

function hideSendOptions() {
    undimBackground();
    $("#sendOptionsWindow").css("display", "none");
}

// Save destination tag to state variable
function saveSendOptions() {
    if($("#destinationTagInput").val()!="") {
      destTag = parseInt($("#destinationTagInput").val());
      $("#currentDestinationTag").html(""+destTag);
    }
    else {
      destTag = "";
      $("#currentDestinationTag").html("None");
    }
    
    memo = $("#memoInput").val();
    
    hideSendOptions();
}

function cancelSendOptions() {
    hideSendOptions();
}

// Login warning when no secret key
function loginWarning() {
  if(isMobile()&&showChat) hideChatbox();
  errored=true; 
  $("#errors").html("You must <a href='#' onclick='showLogin();'>Login</a> with your secret key first to do that.");
  refreshLayout();
  $("#account").css("border-color", "red");
}

// Asynchronous cancel order command; note that cancels are not instantenous so the user will be confused by orders still being there
function cancelOrder(seq) {
  if(address!="" && key!="") {
    if($.isNumeric(seq)) {
      var order = {orderSequence:seq};
      var options = {};
      options.maxFee = maxFee;
      options.maxLedgerVersionOffset = maxLedgerOffset;
      noDisconnecting = true; // Disable periodic reconnection
      api.prepareOrderCancellation(address, order, options).then(function(prepared)
      {
          $("#errors").html("Submitting order cancellation... Please wait...");
          
          var transaction = "";
          var transactionID = -1;
          try {
            var result = api.sign(prepared.txJSON, key);
            transaction = result.signedTransaction;
            transactionID = result.id;
          }
          catch(er) {
            errored = true;
            $("#errors").html("Error signing order to cancel: "+er);
            refreshLayout();
          }
          
          if(transaction!="") {
            api.submit(transaction).then(function(result) {
              errored = true; // Set to true to avoid refresh loop from clearing
              
              // Friendlier messages, especially to explain delay in cancellation effect
              if(result.resultCode=="tesSUCCESS")
                $("#errors").html("Order cancellation submitted. Cancellation may take a few minutes");
              else if(result.resultCode=="terQUEUED") $("#errors").html("Cancel queued due to high load on network. Check back in a few minutes to confirm completion and retry if not.");
              else $("#errors").html("Result for cancellation attempt ("+result.resultCode+"): "+result.resultMessage);
              //loadAccount();
              noDisconnecting = false; // Re-enable periodic reconnection
              refreshLayout();
            }, function (err) {
            
              errored = true; // Set to true to avoid refresh loop from clearing
              $("#errors").html("Error cancelling order: "+err);
              noDisconnecting = false; // Re-enable periodic reconnection
              refreshLayout();
              
            });
          }
          else noDisconnecting = false; // Re-enable periodic reconnection
      }, function (er) {
          errored = true; // Set to true to avoid refresh loop from clearing
          $("#errors").html("Error preparing to cancel order: "+err);
          noDisconnecting = false; // Re-enable periodic reconnection
          refreshLayout();
      });
    }
  }
  else {
    loginWarning();
  }
}

// Informational window on trustlines
function aboutReceivables() {
  showPopup(""+$("#trustlinesInfo").html(), "Sending and Receiving...");
}

// General transaction submission for buy, sell, issue, send
function submitTransaction() {
  if(!address || !key) {
    loginWarning();
  }
  else if(holdings[baseCurrency] < minBaseCurrency) {
    checkMinBaseCurrency();
    $("#errors").html("Account not activated yet with <a href='#started' onclick='$(\"#about\").css(\"display\", \"block\"); jQuery(\"html,body\").animate({scrollTop: jQuery(\"#started\").offset().top}, 1000); setURL(\"#started\"); "+(isMobile()? "hideMiscMenu();":"")+" return false;'>minimum "+nFormatter(minBaseCurrency, accuracy)+" "+baseCurrency+"</a>.");
    errored = true;
  }
  else {
    errored = false;
    $("#errors").html("&nbsp;");
    var trans = action;
    if(trans=="issue") trans = "sell";
    
    // Sending logic
    if(trans=="send") {
        updateSymbol1();
        var qty = parseFloat($("#qty1").val());
        var recipient = $("#recipient").val();
        
        // Pre-checks for sending
        if(qty<=0 || !$.isNumeric(qty)) {
          errored = true;
          $("#errors").html("Please specify qty above 0.");
          refreshLayout();
        }
        else if(!symbol1) {
          errored = true;
          $("#errors").html("Please input a valid token symbol.");
          refreshLayout();
        }
        else if(symbol1.length!=3) {
          errored = true;
          $("#errors").html("Token symbols must be exactly 3 letters.");
          refreshLayout();
        }
        else if(!issuer1 && !(symbol1 in issuers && issuers[symbol1].length==0)) {
          errored = true;
          $("#errors").html("Please specify issuer's address for the token in the format Symbol.Issuer");
          refreshLayout();
        }
        else if(!recipient) {
          errored = true;
          $("#errors").html("Please specify recipient address.");
          refreshLayout();
        }
        else {
          // All preliminary checks passed
          
          // Check if other account needs to add a trustline to the symbol
          var trusted = false;
          new Promise(function(resolve, reject) { 
            if(symbol1==baseCurrency || issuer1==recipient) { // No need for trustlines on XRP or if they are the issuer
              trusted = true;
              resolve();
            }
            else {
              try {
                noDisconnecting = true;
                // Look up recipient trustlines to check they can receive the symbol
                api.getTrustlines(recipient, {counterparty:issuer1, currency:symbol1}).then(function(lines) {
                  noDisconnecting = false;
                  if(lines) {
                    console.log(lines);
                    for(var i = 0; i<lines.length; i++) {
                      if(lines[i].specification.currency==symbol1 && lines[i].specification.counterparty==issuer1 && parseFloat(lines[i].specification.limit)>=qty) {
                      trusted = true;
                      console.log("Found.");
                      break;
                      }
                    }
                    resolve();
                  }
                });
              }
              catch (er) { noDisconnecting = false; }
            }
          }).then(function() {
            if(!trusted) {
              // Error if recipient doesn't have a trustline needed
              errored = true;
              $("#errors").html("Error: Recipient does not accept "+symbol1+" issued by "+getIssuerName(issuer1)+".<br />Ask Recipient to <a href='#' onclick='aboutReceivables();'>Set Receivable Tokens</a> to include it on their list.");
              refreshLayout();
            }
            // Otherwise prepare and send the tokens
            else {
              var payment = {};
              payment.source = {};
              payment.source.address = address;
              payment.source.maxAmount = {};
              payment.source.maxAmount.value = ""+qty;
              payment.source.maxAmount.currency = symbol1;
              if(issuer1!="" && (!(symbol1 in issuers) || issuers[symbol1].length>0))
                payment.source.maxAmount.counterparty = issuer1;
              
              payment.destination = {};
              payment.destination.address = recipient;
              payment.destination.amount = {};
              payment.destination.amount.value = ""+qty;
              payment.destination.amount.currency = symbol1;
              if(symbol1!=baseCurrency && issuer1!="" && (!(symbol1 in issuers) || issuers[symbol1].length>0))
                payment.destination.amount.counterparty = issuer1;
              if(destTag!="")
                payment.destination.tag = destTag;
              if(memo!="") {
                payment.memos = [{data:memo}];
              }
                
              if(symbol1!=baseCurrency) payment.allowPartialPayment = true;
              
              try {
                console.log(payment);
                
                // Always need to overestimate ledgeroffset and maxfee, else we error out during high traffic
                var options = {};
                options.maxFee = maxFee;
                options.maxLedgerVersionOffset = maxLedgerOffset;
                noDisconnecting = true;
                api.preparePayment(address, payment, options).then(function(prepared)
                  {
                    $("#errors").html("Submitting send transaction... Please wait...");
                  
                    var transaction = "";
                    var transactionID = -1;
                    try {
                      var result = api.sign(prepared.txJSON, key);
                      transaction = result.signedTransaction;
                      console.log(transaction);
                      transactionID = result.id;
                    }
                    catch(er) {
                      errored = true;
                      $("#errors").html("Error signing transaction to send: "+er);
                      refreshLayout();
                    }
                    
                    if(transaction!="") {
                      api.submit(transaction).then(function(result) {
                        errored = true;
                        
                        // Friendlier messages
                        if(result.resultCode=="tesSUCCESS")
                          $("#errors").html(qty+" "+$("#symbol1").val()+" <a href='"+transactionHistoryURL+transactionID+"' target='_blank'>sent to "+recipient+(destTag==""? "":" (Destination Tag "+destTag+")")+"</a>!");
                        else if(result.resultCode=="terQUEUED") $("#errors").html("Sending queued due to high load on network. Check <a href='"+transactionHistoryURL+transactionID+"' target='_blank'>transaction details</a> in a few minutes to confirm if sent and retry if not.");
                        else if(result.resultCode=="tecINSUF_RESERVE_OFFER") $("#errors").html("Send failed due to insufficient "+baseCurrency+". Will go below minimum account balance (<a href='#started' onclick='$(\"#about\").css(\"display\", \"block\"); jQuery(\"html,body\").animate({scrollTop: jQuery(\"#started\").offset().top}, 1000); setURL(\"#started\"); "+(isMobile()? "hideMiscMenu();":"")+" return false;'>"+baseCurrency+": "+nFormatter(minBaseCurrency, accuracy)+"</a>).");
                        else if(result.resultCode=="tecUNFUNDED_PAYMENT") $("#errors").html("Send failed due to insufficient funds to send.");
                        else if(result.resultCode=="tecNO_LINE") $("#errors").html("Send failed. You must add "+$("#symbol1").val()+" to your <a href='#' onclick='showTrustlines();'>Receivable Tokens</a> list first.<br />Issuer may also require other steps.  Contact issuer for details.");
                        else if(result.resultCode=="tecNO_AUTH") $("#errors").html("Send failed. Authorization from Issuer required to trade or exchange "+$("#symbol1").val()+".<br />Contact Issuer to have them add you and recipient to their Authorized Token Holders list.");
                        else if(result.resultCode=="tecPATH_DRY") $("#errors").html("Send failed. Issuer does not allow sending of "+$("#symbol1").val()+" token.<br />Contact Issuer to have them enable this via \"defaultRipple\" in Advanced Settings.");
                        else $("#errors").html("Send attempted with response ("+result.resultCode+"): "+result.resultMessage+" <a href='"+transactionHistoryURL+transactionID+"' target='_blank'>See Transaction Details...</a><br />Check <a href='"+accountHistoryURL+address+"' target='_blank'>Account History</a> to confirm successful transaction.");
                        
                        noDisconnecting = false;
                        refreshLayout();
                      }, function (err) {
                        errored = true;
                        $("#errors").html("Error sending to recipient: "+err);
                        noDisconnecting = false;
                        refreshLayout();
                      });
                    }
                    else noDisconnecting = false;
                }, function (er) {
                    errored = true;
                    $("#errors").html("Error preparing to send: "+er);
                    noDisconnecting = false;
                    refreshLayout();
                });
              }
              catch(ex) {
                errored = true;
                $("#errors").html("Error sending: "+ex);
                refreshLayout();
              }
            }
          });
        }
      }
      
      // Buy/sell/issue logic - issuing is technically the same as selling what you don't have
      else if(trans=="buy" || trans=="sell") {
        updateSymbols();
        var qty1 = parseFloat($("#qty1").val());
        var price = parseFloat($("#price").val());
        
        // Preliminary checks
        if(qty1<=0 || !$.isNumeric(qty1)) {
          errored = true;
          $("#errors").html("Please specify qty above 0.");
          refreshLayout();
        }
        else if(!symbol1) {
          errored = true;
          $("#errors").html("Please input a valid token symbol.");
          refreshLayout();
        }
        else if(!issuer1 && !(symbol1 in issuers && issuers[symbol1].length==0)) {
          errored = true;
          $("#errors").html("Please specify issuer's address for "+symbol2+" in the format Symbol.Issuer");
          refreshLayout();
        }
        else if(price<=0 || !$.isNumeric(price)) {
          errored = true;
          $("#errors").html("Please specify price above 0.");
          refreshLayout();
        }
        else if(!symbol2) {
          errored = true;
          $("#errors").html("Please input a valid token symbol.");
          refreshLayout();
        }
        else if(!issuer2 && !(symbol2 in issuers && issuers[symbol2].length==0)) {
          errored = true;
          $("#errors").html("Please specify issuer's address for "+symbol2+" in the format Symbol.Issuer");
          refreshLayout();
        }
        else if(symbol1.length!=3 || symbol2.length!=3) {
          errored = true;
          $("#errors").html("Token symbols must be exactly 3 letters.");
          refreshLayout();
        }
        else if(symbol1!="" && action=="issue" && issuer1=="" && address!="") {
          errored = true;
          $("#errors").html("Invalid token symbol to issue. Choose a different name to issue your own token.");
        }
        else {
        
          // Prepare and send the order
          $("#errors").html("Submitting order request to "+action+" "+qty1+" "+symbol1+"... Please wait...");
        
          var order = {};
          order.direction = trans;
          
          order.quantity = {};
          order.quantity.currency = symbol1;
          order.quantity.value = ""+qty1;
          if(issuer1!="" && (!(symbol1 in issuers) || issuers[symbol1].length>0))
            order.quantity.counterparty = issuer1;
        
          order.totalPrice = {};
          order.totalPrice.currency = symbol2;
          order.totalPrice.value = ""+(Math.round(price*qty1 * 1000000)/1000000);
          if(issuer2!="" && symbol2!=baseCurrency && (!(symbol2 in issuers) || issuers[symbol2].length>0))
            order.totalPrice.counterparty = issuer2;

          try {
            console.log(order);
            
            // Overestimate the maxfee and ledgeroffset to avoid timing out during high volume
            var options = {};
            options.maxFee = maxFee;
            options.maxLedgerVersionOffset = maxLedgerOffset;
            noDisconnecting = true;
            api.prepareOrder(address, order, options).then(function(prepared)
              {
                
                var transaction = "";
                var transactionID = -1;
                try {
                  var result = api.sign(prepared.txJSON, key);
                  transaction = result.signedTransaction;
                  console.log(transaction);
                  transactionID = result.id;
                }
                catch(er) {
                  errored = true;
                  $("#errors").html("Error signing transaction to "+action+": "+er);
                  refreshLayout();
                }
                
                
                if(transaction!="") {
                  api.submit(transaction).then(function(result) {
                    var issueInfo = "";
                    errored = true;
                    
                    // Friendlier error messages
                    if(action=="issue") issueInfo = "<br /><br />"+getIssuedText();
                    if(result.resultCode=="tesSUCCESS")
                      $("#errors").html("Order submitted to "+action+" "+qty1+" "+symbol1+"! <a href='"+transactionHistoryURL+transactionID+"' target='_blank'>See Transaction Details...</a>"+issueInfo);
                    else if(result.resultCode=="terQUEUED") $("#errors").html("Order queued due to high load on network. Check <a href='"+transactionHistoryURL+transactionID+"' target='_blank'>transaction details</a> in a few minutes to confirm if successful and retry if not.");
                    else if(result.resultCode=="tecINSUF_RESERVE_OFFER") $("#errors").html("Order failed due to insufficient "+baseCurrency+".  Will go below minimum account balance (<a href='#started' onclick='$(\"#about\").css(\"display\", \"block\"); jQuery(\"html,body\").animate({scrollTop: jQuery(\"#started\").offset().top}, 1000); setURL(\"#started\"); "+(isMobile()? "hideMiscMenu();":"")+" return false;'>"+baseCurrency+": "+nFormatter(minBaseCurrency, accuracy)+"</a>).");
                    else if(result.resultCode=="tecUNFUNDED_OFFER") $("#errors").html("Order failed due to insufficient funds.");
                    else if(result.resultCode=="tecNO_LINE" || result.resultCode=="tecPATH_DRY") $("#errors").html("Order failed. You must add "+symbol1+" to your <a href='#' onclick='showTrustlines();'>Receivable Tokens</a> list first.<br />Issuer may also require other steps; contact issuer for details.");
                    else if(result.resultCode=="tecNO_AUTH") $("#errors").html("Order failed.  Authorization from Issuer required to trade or exchange "+$("#symbol1").val()+".<br />Contact Issuer to have them add you to their Authorized Token Holders list.");
                    else $("#errors").html("Order submitted, received response ("+result.resultCode+"): "+result.resultMessage+".<br /><a href='"+transactionHistoryURL+transactionID+"' target='_blank'>Check Transaction Details</a> after a few minutes to confirm if successful and retry if not."+issueInfo);
                    
                    noDisconnecting = false;
                    refreshLayout();
                  }, function (err) {
                    errored = true;
                    $("#errors").html("Error in "+action+" submission: "+err);
                    noDisconnecting = false;
                    refreshLayout();
                  });
                }
                else noDisconnecting = false;
            }, function (er) {
                errored = true;
                $("#errors").html("Error preparing to send: "+err);
                noDisconnecting = false;
                refreshLayout();
            });
          }
          catch(ex) {
            errored = true;
            $("#errors").html("Error "+action+"ing: "+ex);
            refreshLayout();
          }
        }
    }
  }
}

// Check for display name or issuer name updated by RippleAPI
function getIssuerName(addr) {
  if(addr == address) return "You";
  else if (addr in displayName) return displayName[addr];
  else if(addr in issuerNames) return issuerNames[addr];
  else return addr;
}


function dimBackground() {
  $("#loginBackground").css("display", "block");
  errored = false;
  refreshLayout();
  if(isMobile()) $("#about").css("display", "none");
}

function undimBackground() {
  errored = false;
  $("#errors").html("&nbsp;");
  refreshImmediately = true;
  
  $("body").css("overflow", "auto");
  $("#loginBackground").css("display", "none");
  refreshLayout();
  
  if(isMobile()) $("#about").css("display", "block");
}

// Generate a new account address using Ripple API call
function createAccount() {
  try {
    noDisconnecting = true;
    var newAccount = api.generateAddress();
    $("#accountInput").val(newAccount.address);
    $("#keyInput").val(newAccount.secret);
    $("#newAccountField").html("New account details above.<br />Save them before logging in!");
    noDisconnecting = false;
    showLogin(false);
  }
  catch (ex) {
    $("#newAccountField").html("Error creating account:<br /><small>"+ex+"</small>");
  }
}

// Force a price update to the page
function loadURLPrice(action, symbol1, price, symbol2) {
  new Promise(function(resolve, reject) {
      resolve();
    }).then(function() {
      if(action!="") $("#action").val(action);
      $("#price").val(parseFloat(parseFloat(price).toFixed(accuracy)));
      $("#symbol1").val(symbol1);
      $("#symbol2").val(symbol2);
  }).then(function() {
      if(action!="") updateAction();
      else errored = false;
  }).then(function() {
    updateSymbols();
  }).then(function () {
    updateURL();
  });
}

// Force an action / qty / symbol update to page
function loadURLSymbol(action, qty1, symbol1) {
  new Promise(function(resolve, reject) {
    resolve();
  }).then(function() {
    if(action!="") $("#action").val(action);
    $("#qty1").val(parseFloat(parseFloat(qty1).toFixed(accuracy)));
    var symParts = symbol1.split('.');
    if(symParts.length>1) issuer1 = symParts[1];
    else issuer1 = "";
    $("#symbol1").val(symParts[0]);
  }).then(function() {
      if(action!="") updateAction();
      else errored = false;
  }).then(function() {
    updateSymbols();
  }).then(function () {
    updateURL();
  });
}

// Force an update to page for symbol pair
function loadURLSymbols(action, qty1, symbol1, price, symbol2) {
  new Promise(function(resolve, reject) {
      resolve();
    }).then(function() {
      if(action!="") $("#action").val(action);
      $("#qty1").val(parseFloat(parseFloat(qty1).toFixed(accuracy)));
      $("#price").val(parseFloat(parseFloat(price).toFixed(accuracy)));
      $("#symbol1").val(symbol1);
      $("#symbol2").val(symbol2);
  }).then(function() {
      if(action!="") updateAction();
      else errored = false;
  }).then(function() {
    updateSymbols();
  }).then(function () {
    updateURL();
  });
}

// Deprecated stock ticker scroller at top of page
function marquee(a, b) {
  var width = b.width();
  var start_pos = a.width();
  var end_pos = -width;

  function scroll() {
      if (b.position().left <= -width) {
          b.css('left', start_pos);
          scroll();
      }
      else {
          time = (parseInt(b.position().left, 10) - end_pos) *
              (10000 / (start_pos - end_pos));
          b.animate({
              'left': -width
          }, time, 'linear', function() {
              scroll();
          });
      }
  }

  b.css({
      'width': width,
      'left': start_pos
  });
  scroll(a, b);
  b.mouseenter(function() {   
      b.stop();                 
      b.clearQueue();           
  });                           
  b.mouseleave(function() {     
      scroll(a, b);            
  });                           
}

// Run Ripple-powered chatroom, all chat stored on Ripple ledger via memos!
function runChat() {
  // Ping the chatwallet for incoming transactions and parse the memos attached
  
  if(showChat) { // download chat only if the box is showing and enabled
  
    var firstRun = false;
    var options = {earliestFirst:true, initiated:false, types:["payment"]};
    if(lastChat!="") {
      if(lastChat!=null) {
        options.start=lastChat;
        options.limit = 10;
      }
    }
    else { // only first time page runs do we show this
      lastChat = null; // so we go to the block above next time but still don't have an ID
      firstRun = true;
      options.earliestFirst = false;
      options.limit = 100;
    }
    if(firstRun) {
      $("#chatHistoryContents").append("Retrieving chat messages...");
    }
    
    new Promise(function(resolve, reject) { 
      try {
        if(chatAPI.isConnected()) {
          resolve();
        }
        else {
          console.log('Disconnected in runChat.');
          try {
            chatAPI.connect().then(function() {
                console.log("Reconnected in runChat.");
                resolve();
            }, function (err) {
              console.log("Failed to reconnect in runChat: "+err);
              resolve();
            });
          }
          catch (er) {
            console.log("Failed to reconnect in runChat: "+er);
            resolve();
          }
        }
      }
      catch (erx) {
        console.log("Error in runChat API connect: "+erx);
        resolve();
      }
    }, function(er) { console.log("Error in runChat reconnection: "+er); return null; }).then(function() {
      
      // Retrieve transactions of the chat wallet as chat history
      if(chatAPI.isConnected())
        return chatAPI.getTransactions(chatWallet, options );
      else return null;
      
    }, function(err) { console.log("Error retrieving transactions from chat server: "+err); return null; })
    .then(function (transactions) {
        // Need to iterate through messages one at a time in linear fashion
        if(firstRun) getAllDisplayNames(function () { runChat3(transactions, firstRun); });
        else runChat2(transactions, 0, firstRun);
        
    }, function(err) {
      if(err=="[MissingLedgerHistoryError(Server is missing ledger history in the specified range)]") {
        if(firstRun)
          printChat("No messages found.");
        
      }
      else console.log("Chat retrieval error: "+err);
    });
  }
  else {
    setTimeout(runChat, chatUpdateInterval*1000);
  }
}

// Look up names one at a time
function runChat2(transactions, i, firstRun) {
  if(transactions!=null && i<transactions.length) {
      if(firstRun) i = transactions.length-1;
      if((!firstRun || i==transactions.length-1) && transactions[i].address!=null && transactions[i].specification!=null 
            && transactions[i].specification.memos!=null && transactions[i].specification.memos.length>0
            && transactions[i].specification.memos[0].data!=null && transactions[i].specification.memos[0].data!="")
      {
          if(!(transactions[i].address in displayName)) {
              getDisplayName(transactions[i].address).then(function() {
                runChat2(transactions, i+1, firstRun);
              });
          }
          else runChat2(transactions, i+1, firstRun);
      }
      else runChat2(transactions, i+1, firstRun);
  }
  else runChat3(transactions, firstRun);
}

// Print chat messages
function runChat3(transactions, firstRun) {
  if(transactions!=null) {
    for(var i = 0; i<transactions.length; i++) {
      if(firstRun) {
        console.log("Skipping to earliest chat in query for first pass...");
        i = transactions.length-1;
      }
      try {
        if(chatLoaded && transactions[i].id==lastChat) continue;
        else lastChat = transactions[i].id;
        
        
        // print the earliest one (last one) on the first loop because it'll be skipped by options.start in the future
        if((!firstRun || i==transactions.length-1) && transactions[i].address!=null && transactions[i].specification!=null 
          && transactions[i].specification.memos!=null && transactions[i].specification.memos.length>0
          && transactions[i].specification.memos[0].data!=null && transactions[i].specification.memos[0].data!="")
          {
            if(!chatLoaded && !(transactions[i].address in displayName)) displayName[transactions[i].address] = ""; // prevent look-up later because we already know they don't have a name
            
            printChat("<b>" + formatDate(new Date(transactions[i].outcome.timestamp))+"</b> - "+(transactions[i].address in displayName && displayName[transactions[i].address]!=""? "<b>"+displayName[transactions[i].address]+" </b> ("+transactions[i].address+")":"<b>"+transactions[i].address+"</b>")+":<br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"+stripHTML(transactions[i].specification.memos[0].data));
          }
      }
      catch(ex) {
        console.log("Chat parsing error: "+ex);
      }
    }
  }
  if(firstRun) {
    // avoid querying the same transactions twice
    console.log("Re-traversing first chat retrieval in chronological order...");
    transactions.reverse();
    runChat3(transactions, false);
  }
  else {
    if(!firstRun && !chatLoaded) 
      chatLoaded = true;
    if(currentChatUpdateInterval<chatUpdateInterval) currentChatUpdateInterval+=0.1;
    setTimeout(runChat, firstRun? 1:currentChatUpdateInterval*1000);
  }
}


function formatDate(date) {
  var monthNames = [
    "Jan", "Feb", "Mar",
    "Apr", "May", "Jun", "Jul",
    "Aug", "Sep", "Oct",
    "Nov", "Dec"
  ];

  var day = date.getDate();
  var monthIndex = date.getMonth();
  var year = date.getFullYear();

  return monthNames[monthIndex]+' '+day + ' ' + year+ ' '+date.toTimeString().split(' ')[0];
}
function printChat(msg) {
  var scrolled = $('#chatHistoryContents').scrollTop()+$('#chatHistoryContents').innerHeight()>=$('#chatHistoryContents')[0].scrollHeight*.75;
  $("#chatHistoryContents").append("<br />"+msg);
  if(scrolled) $('#chatHistoryContents').scrollTop($('#chatHistoryContents')[0].scrollHeight);
}

// Send chat message by submitting an empty order to chatWallet but with memo attached
function sendChat() {
  if(address=="" || key=="") printChat("--- You must login with your secret key first! Chat messages cost a fraction of "+baseCurrency+" ("+nFormatter(fee+0.000001, accuracy)+") to create the transactions on the network. ---");
  else if($("#chatMessage").val()=="") { }
  else {
      var payment = {};
      payment.source = {};
      payment.source.address = address;
      payment.source.maxAmount = {};
      payment.source.maxAmount.value = ""+0.000001;
      payment.source.maxAmount.currency = baseCurrency;
      
      payment.destination = {};
      payment.destination.address = chatWallet;
      payment.destination.amount = {};
      payment.destination.amount.value = ""+0.000001;
      payment.destination.amount.currency = baseCurrency;
      
      // Add the chat message
      payment.memos = [{data:stripHTML($("#chatMessage").val())}];
      
      try {
        console.log(payment);
        
        // Always need to overestimate ledgeroffset and maxfee, else we error out during high traffic
        var options = {};
        options.maxFee = maxFee;
        options.maxLedgerVersionOffset = maxLedgerOffset;
        noDisconnecting = true;
        api.preparePayment(address, payment, options).then(function(prepared)
          {
          
            var transaction = "";
            var transactionID = -1;
            try {
              var result = api.sign(prepared.txJSON, key);
              transaction = result.signedTransaction;
              console.log(transaction);
              transactionID = result.id;
            }
            catch(er) {
              errored = true;
              printChat("--- Error signing chat message to send: "+er+" ---");
            }
            
            if(transaction!="") {
              $("#chatMessage").prop("placeholder", "Sending... (takes up to 4 sec)");
              setTimeout(function() { $("#chatMessage").prop("placeholder", "Enter chat to send."); }, 3000);
              $("#chatMessage").val("");
              currentChatUpdateInterval = 1; // temporarily speed up updates so you see your comment as soon as it's up
              
              api.submit(transaction).then(function(result) {
                errored = true;
                
                // Friendlier messages
                if(result.resultCode=="tesSUCCESS")
                  { } // Ripple takes 4 sec to confirm
                else if(result.resultCode=="terQUEUED") printChat("--- Chat message queued due to high load on network. Wait a few min and try again if no result. ---");
                else if(result.resultCode=="tecINSUF_RESERVE_OFFER") printChat("--- Chat not sent due to insufficient "+baseCurrency+". Every message costs at least a fraction of "+baseCurrency+" ("+nFormatter(fee+0.000001, accuracy)+"). ---");
                else printChat("--- Notice on recent chat submission ("+result.resultCode+"): "+result.resultMessage+". ---");
                
                noDisconnecting = false;
              }, function (err) {
                errored = true;
                printChat("--- Error sending chat message: "+err+" ---");
                noDisconnecting = false;
              });
            }
            else noDisconnecting = false;
        }, function (er) {
            errored = true;
            printChat("--- Error preparing to send chat: "+err+" ---");
            noDisconnecting = false;
        });
      }
      catch(ex) {
        errored = true;
        printChat("--- Error sending chat: "+ex+" ---");
      }
    }
}

// Fill bottom half of the screen with chatbox where the orderbook is
function chatFullScreen() {
  if(isMobile()) { // bottom half of page
    $("#chatbox").css("width", $(window).width()-10);
    $("#chatbox").css("height", ($("#container").height()-($("#subnavigation").offset().top + $("#subnavigation").height()))*.98);
    $("#chatbox").css("left", 0);
    $("#chatbox").css("bottom", 0);
    $("#chatbox").css("top", "auto" );
  }
  else if($(window).height()<600) { // center over orderbook
    $("#chatbox").css("width", $("#submit").offset().left + $("#submit").width() - $("#action").offset().left);
    $("#chatbox").css("height", $("#footer").offset().top+$("#footer").height() - $("#errors").offset().top-30);
    $("#chatbox").css("left", $("#action").offset().left);
    $("#chatbox").css("top", Math.min(windowHeight()-$("#footer").height()*.15-$("#chatbox").height(), $("#errors").offset().top+30));
    $("#chatbox").css("bottom", "auto" );
    $("#chatbox").css("right", "auto" );
  }
  else { // full right side
    $("#chatbox").css("width", ($("#container").width()-($("#container").width()-($("#form").offset().left+$("#form").width()))-$("#submit").width()-$("#submit").offset().left)*.7);
    $("#chatbox").css("height", ($("#container").height()-($("#subnavigation").offset().top + $("#subnavigation").height()))*.98);
    $("#chatbox").css("right", $("#container").width()-($("#form").offset().left+$("#form").width()) );
    $("#chatbox").css("bottom", $("#container").height()-($("#form").offset().top + $("#form").height()) );
    $("#chatbox").css("top", "auto" );
    $("#chatbox").css("left", "auto" );
  }
  refreshChatLayout();
}
// Check if full screen chat box
function chatIsFullScreen() {
  var isFull = false;
  // bottom half of page
    if(!isFull) isFull = $("#chatbox").width()*1.1>=$(window).width()-10 
    && $("#chatbox").height()*1.1>= ($("#container").height()-($("#subnavigation").offset().top + $("#subnavigation").height()))*.98;
  // center over orderbook
    if(!isFull) isFull = $("#chatbox").width()*1.1>=$("#submit").offset().left + $("#submit").width() - $("#action").offset().left 
    && $("#chatbox").height()*1.1>= $("#footer").offset().top+$("#footer").height() - $("#orderbook").offset().top-30;
  // full right side
    if(!isFull) isFull = $("#chatbox").width()*1.1>=($("#container").width()-($("#container").width()-($("#form").offset().left+$("#form").width()))-$("#submit").width()-$("#submit").offset().left)*.7
    && $("#chatbox").height()*1.1>= ($("#container").height()-($("#subnavigation").offset().top + $("#subnavigation").height()))*.98;
  
  return isFull;
}
function resetChatSize() {
  if(isMobile()) chatFullScreen();
  else {
    $("#chatbox").css("width", ($("#container").width()-($("#container").width()-($("#form").offset().left+$("#form").width()))-$("#submit").width()-$("#submit").offset().left)*.7);
    $("#chatbox").css("height", ($("#container").height()-($("#container").height()-($("#form").offset().top + $("#form").height()))-$("#submit").height()-$("#submit").offset().top)*.6);
    $("#chatbox").css("right", $("#container").width()-($("#form").offset().left+$("#form").width()) );
    $("#chatbox").css("bottom", $("#container").height()-($("#form").offset().top + $("#form").height()) );
    $("#chatbox").css("top", "auto" );
    $("#chatbox").css("left", "auto" );
    refreshChatLayout();
  }
}
function refreshChatLayout() {
  var scrollDown = $('#chatHistoryContents').scrollTop()+$('#chatHistoryContents').innerHeight()>=$('#chatHistoryContents')[0].scrollHeight*.75;
  $("#chatMessage").css("width", $("#chatHistory").width()-$("#sendChat").width()-10);
  $("#chatHistory").css("height", $("#chatbox").height()-$("#chatControls").height()-($("#chatHistory").offset().top-$("#chatbox").offset().top)-($("#chatControls").offset().top-($("#chatHistory").offset().top+$("#chatHistory").height())));
  $("#chatHistoryContents").css("height", $("#chatHistory").outerHeight()-$("#chatHistoryContents").position().top + +$("#chatHeader").height());
  if(scrollDown) 
    $('#chatHistoryContents').scrollTop($('#chatHistoryContents')[0].scrollHeight);
}

// condition for mobile view
function isMobile() {
  return $("#controlMiscMenu").css("display")!="none";
}

// Page initiation block
$(document).ready(function() {

     // Initial page fitting
    rescaleWindow(false);
    
    // Auto-resize the page when orientation changes (for phones)
    $( window ).on( "orientationchange", function( ) {
			rescaleWindow();
		});
		
		// Auto-resize if the window resizes as well
    window.onresize = rescaleWindow;
    
    // Clear the javascript warning message at start because we clearly have javascript enabled
    $("#errors").html("&nbsp;");
    
    // Hide about box by default
    if(!isMobile()) $("#about").css("display", "none");
    
    
    // Disable form submission - we don't want to actually ever submit anything to the site
    $('#form').on('submit', function(e) {
        e.preventDefault();  //prevent form from submitting
        return false;
    });
    
    // Update the action state variable whenever the form changes
    $('#action').change(function() {updateAction(); updateURL(); });
    updateAction();
    
    // Update the state variables when form fields change
    $('#symbol1').change(function() {errored = false; $("#errors").html("&nbsp;"); issuer1 = ""; updateSymbol1(); updateURL(); });
    $('#symbol2').change(function() {errored = false; $("#errors").html("&nbsp;"); issuer2 = ""; updateSymbol2(); updateURL();  });
    $('#qty1').change(function() { updateURL(); if(action=="send") errored = false;  });
    $('#price').change(function() { updateURL();  });
    $('#recipient').change(function() { updateURL();  });
    
    // Windows to pop up depending on what is clicked
    $("#accountInput").keypress(function (e) {if (e.which == 13) { saveLogin(); return false; }});
    $("#keyInput").keypress(function (e) {if (e.which == 13) { saveLogin(); return false; }});
    $("#loginSubmit").on("click", function() { saveLogin(); });
    $("#logoutSubmit").on("click", function() { logout(); });
    $("#newAccountSubmit").on("click", function() { createAccount(); });
    $("#cancelLogin").on("click", function() { hideLogin(); });
    $("#submit").on("click", function() { submitTransaction(); });
    $("#account").on("click", function() { showLogin(); });
    $("#submitSettings").on("click", function() { saveSettings(); });
    $("#cancelSettings").on("click", function() { hideSettings(); });
    
    // Update the issuer field to match whatever the dropdown menu changes to
    document.getElementById('issuerList').onchange = function() { $("#issuerInput").val($("#issuerList").val()); };
    
    // Other form controls
    hideIssuer(); 
    $("#cancelBacker").on("click", function() { hideIssuer(); });
    $("#backerSubmit1").on("click", function() { saveIssuer1(); updateURL(); });
    $("#backerSubmit2").on("click", function() { saveIssuer2(); updateURL(); });
    
    $("#submitNewTrust").on("click", function() { addTrustline(); });
    $("#cancelTrust").on("click", function() { hideTrustlines(); });
    $("#submitTrust").on("click", function() { saveTrustlines(); });
    
    $("#sendOptionsSubmit").on("click", function() { saveSendOptions(); updateURL(); });
    $("#sendOptionsCancel").on("click", function() { cancelSendOptions(); });
    
    $("#chatMessage").keypress( function(e) { if(e.which==13) {sendChat(); return false; } });
    $("#chatMessage").on( "click", function() { $('#chatHistoryContents').scrollTop($('#chatHistoryContents')[0].scrollHeight); });
    $("#sendChat").on("click", function() { sendChat(); });
    
    $("#setDisplayNameSubmit").on("click", function() { saveDisplayName(); });
    $("#setDisplayNameCancel").on("click", function() { cancelDisplayName(); });
    
    // General ok button for informational popup windows
    $("#okPopup").on("click", function() { hidePopup(); });

    
    // Load address from cookie if it exists
    console.log("Account addressed restored from cookie: "+Cookies.get('accountAddr'));
    $("#account").val(Cookies.get('accountAddr'));
    address = $("#account").val();
    $("#miscMenu").html(""); // Force account menu refresh
    updateLoginMessage();
    
    
    // Deprecated scrolling stock ticker thing at top
    /*$("#scrollingText").smoothDivScroll({
      autoScrollingMode: "always",
      autoScrollingDirection: "endlessLoopRight",
      autoScrollingStep: 1,
      autoScrollingInterval: 15 
    });
    
    $("#scrollingText").bind("mouseover", function(){
      $("#scrollingText").smoothDivScroll("stopAutoScrolling");
    });
    
    $("#scrollingText").bind("mouseout", function(){
      $("#scrollingText").smoothDivScroll("startAutoScrolling");
    });*/
    
    // Smooth scroll the screen for page anchors
    var hashTag = window.location.hash;
    if (hashTag === "#about" || hashTag=="#instant" || hashTag=="#represent" || hashTag=="#global" || hashTag.indexOf("#started")>=0 || hashTag=="#works" || hashTag=="#reading" || hashTag=="#ico") {
      $("#about").css("display", "block");
      jQuery("html,body").animate({scrollTop: jQuery(hashTag).offset().top}, 1000);
    }
    
    // In case the orderbook or other data take a while, don't leave the user confused
    $("#errors").html("Connecting... Please wait...");
    
    
    try {
      // Randomly select a server and connect
      selectServer();
      api.connect().then(function() {
          return api.getServerInfo();
      }).then( function(info) {
        // Basic server info for sanity check that it exists
        if(info && info.validatedLedger) {
          baseReserve = parseFloat(info.validatedLedger.reserveBaseXRP);
          baseIncrement = parseFloat(info.validatedLedger.reserveIncrementXRP);
          baseFee = parseFloat(info.validatedLedger.baseFeeXRP);
        }
        return api.getFee();
      }).then( function(f) {
        // know the transaction fee
        try {
          if(f) {
            fee = parseFloat(f);
            //console.log("Fee: "+f);
          }
        }
        catch(er) { console.log("Error parsing fee: "+er); }
      })
      
      .then(function() {
        // Load account flags
        return getSettings();
      }, function(err) { 
        console.log("Error getting Settings: "+err);
      
      // Load trustlines
      }).then(function() {
      console.log("Finished loading settings.");
        return getTrustlines();
      }, function(err) { 
        console.log("Error getting Trustlines: "+err);
        
      // Initiate refresh loop of orderbook and account information
      }).then(function() {
          console.log("Finished loading trustlines.");
         console.log("Starting orderbook...");
         updateSymbols();
         refreshLayout();
         loadOrderbook(); 
         refreshLayout();
         rescaleChat();
      }, function(err) { 
        // Retry if we bug out
        console.log("Error starting orderbook: "+err);
        console.log("Retrying start orderbook...");
        loadOrderbook(); 
      }).then(function() {
      
      // Least important stuff go last
      
          // Download latest list of gateways from Data API
          $.get( dataAPI+"/v2/gateways/", function( data ) {
            for(var symbol in data) {
              if(symbol.length>10) continue;
              symbol = stripHTML(symbol);
              if(!(symbol in issuers)) issuers[symbol] = [];
              for(var i = 0; i<data[symbol].length; i++) {
                var cp = stripHTML(data[symbol][i].account);
                if($.inArray(cp, issuers[symbol])===-1)
                  issuers[symbol][issuers[symbol].length] = cp;
                if(!(data[symbol][i].account in issuerNames)) issuerNames[data[symbol][i].account] = stripHTML(data[symbol][i].name);
              }
            }
            
            // Add everything to autocomplete of symbols
            var symbolsList = symbolLister();
            $("#symbol1").autocomplete({ source:symbolsList, minLength:0, select: function(event, ui) { document.getElementById('symbol1').value = ui.item.value; errored = false; $("#errors").html("&nbsp;"); issuer1 = ""; updateSymbol1(); updateURL(); }}).focus(function() {$(this).autocomplete('search', $(this).val())});
            $("#symbol2").autocomplete({ source:symbolsList, minLength:0, select: function(event, ui) { document.getElementById('symbol2').value = ui.item.value; errored = false; $("#errors").html("&nbsp;"); issuer2 = ""; updateSymbol2(); updateURL(); }}).focus(function() {$(this).autocomplete('search', $(this).val())});
            
            
            // Setup chatbox
            // Auto-display chatroom for desktop-users
            if(!isMobile()) {
              showChatbox(false);
              
              // Draggable and resizable chatbox.  Disable when highlighting the text contents
              // Irrelevant to mobile, which is already always maxed out
                $("#chatbox").draggable().resizable({ handles: 'all' }).on('resize', function(e) { refreshChatLayout(); e.stopPropagation(); } );
                var chatbox = $("#chatbox").draggable();
                $('#chatHistoryContents', chatbox).mousedown(function(ev) {
                  chatbox.draggable('disable');
                }).mouseup(function(ev) {
                  chatbox.draggable('enable');
                });
              
              // Chatbox double-click to full screen
              // Mobile is always full screen
                $("#chatbox").dblclick(function() {
                  
                  if(chatIsFullScreen()) {
                    resetChatSize();
                  }
                  else {
                    chatFullScreen();
                  }
                });

            }
            else {
              // full screen default for mobile
              chatFullScreen();
              
              hideChatbox(false);
            }
            
            // Kick off chatbox listener
            rescaleChat();
            namesAPI = new ripple.RippleAPI({server:namesServer});
            getDisplayName().then(function() {
              printDisplayName();
              $("#rippleDisplayNameAddress").html(namesWallet); // Update text info to show names wallet address
              chatAPI = new ripple.RippleAPI({server:chatServer});
              runChat();
            });
            
          }, "json" );
          
          // Clear the message in the middle (connecting) if we're on the buy/sell page
          if(action=="buy" || action=="sell") $("#errors").html("&nbsp;");
          
          // Fancy scrolling controls
          $(window).scroll(function(e) {
            
            // don't fight the animation
            /*if(scrolling) {
              e = e || window.event;
              if (e.preventDefault)
                  e.preventDefault();
              e.returnValue = false; 
              return false;
            }*/
            
            if($("#about").css("display")=="block") {
               var wS = $(this).scrollTop();
               if (!isMobile() && !scrolling && numIntervals>=0 && wS == 0){
                 $("#about").css("display", "none");
                 //jQuery("html,body").animate({scrollTop: jQuery("#container").offset().top}, 1000);
                 setURL("");
               }
             }
            
          });
          
          $(window).on('mousewheel DOMMouseScroll', function(e){
          
            if (e.originalEvent.wheelDelta < 0 || e.originalEvent.detail > 0) {
              if(!disableScrollToAbout && $("#loginBackground").css("display") == "none" && $("#about").css("display")=="none" && $(window).scrollTop() + $(window).height() >= $(document).height()) {
                scrolling = true;
                $("#about").css("display", "block");
                //jQuery("html,body").animate({scrollTop: jQuery("#about").offset().top}, 500);
                setURL("#about");
                setTimeout(function() { scrolling = false; }, 1000);
              }
            }
            
            // don't fight the animation
            /*if(scrolling) {
              e = e || window.event;
              if (e.preventDefault)
                  e.preventDefault();
              e.returnValue = false; 
              return false;
            }*/
          });
          
          // Scrolling for mobile
          $(window).on('touchstart', function(e) {

              var swipe = e.originalEvent.touches;
              
              // breaks iphone
              /*
              if(showChat 
                && swipe[0].pageX>=$("#chatbox").offset().left 
                && swipe[0].pageX<=$("#chatbox").offset().left+$("#chatbox").width()
                && swipe[0].pageY>=$("#chatbox").offset().top 
                && swipe[0].pageY<=$("#chatbox").offset().top+$("#chatbox").height()
              ) {
                e.returnValue = false; 
                return false; // Swiping the chatbox shouldn't scroll the page
              }*/
              
              var start = swipe[0].pageY;

              $(this).on('touchmove', function(e) {

                  var contact = e.originalEvent.touches,
                  end = contact[0].pageY,
                  distance = end-start;

                  if (distance < -30) {
                    if((!isMobile() || !showChat) && !disableScrollToAbout && $("#loginBackground").css("display") == "none" && $("#about").css("display")=="none" /*&& $(window).scrollTop() + $(window).height() >= $(document).height()*/) {
                      scrolling = true;
                      $("#about").css("display", "block");
                      //jQuery("html,body").animate({scrollTop: jQuery("#about").offset().top}, 1000);
                      setURL("#about");
                      setTimeout(function() { scrolling = false; }, 1000);
                    }
                  }
                  
                  // don't fight the animation
                  /*if(scrolling) {
                    e = e || window.event;
                    if (e.preventDefault)
                        e.preventDefault();
                    e.returnValue = false; 
                    return false;
                  }*/
              })
              .one('touchend', function() {

                  $(this).off('touchmove touchend');
              });
              
          });
          
          $(window).on('touchmove',function(){
            
          });
          
          // Detecting if we're scrolling just the chatbox or the whole about page.
          $("#chatbox").mouseenter(function(){
              clearTimeout($(this).data('timeoutId'));
              disableScrollToAbout = true;
          }).mouseleave(function(){
              var someElement = $(this),
                  timeoutId = setTimeout(function(){
                      disableScrollToAbout = false;
                  }, 100);
              //set the timeoutId, allowing us to clear this trigger if the mouse comes back over
              someElement.data('timeoutId', timeoutId); 
          });
          
          
          // Asynchronous disconnect and reconnects
          api.on('error', function(errorCode, errorMessage) {
            console.log("Error: "+errorCode + ': ' + errorMessage);
          });
          api.on('connected', function() {
            console.log('Connected.');
          });
          api.on('disconnected', function(code) {
            // code - [close code](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent) sent by the server
            // will be 1000 if this was normal closure
            if(!reconnecting) {
            console.log('Disconnected, code:', code);
              try {
                reconnecting = true;
                selectServer();
                api.connect().then(function() {
                console.log("Reconnected async.");
                reconnecting = false;
                }, function (err) { 
                console.log("Failed to reconnect async: "+err);
                reconnecting = false;
                });
              }
              catch (er) {
                console.log("Failed to reconnect async: "+er);
                reconnecting = false;
              }
            }
          });
          
      });
    }
    catch(er) {
      console.log("API Error: "+er);
    }
    
});

