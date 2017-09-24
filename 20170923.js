// state variables
var servers = [
  'wss://s1.ripple.com/',
  'wss://s2.ripple.com/',
  'wss://s-east.ripple.com/',
  'wss://s-west.ripple.com/'
];
var settings = {};
var api;
var dataAPI = "https://data.ripple.com";
var lastMktCapUpdate = 0;
var accuracy = 8;

// Resize the layout to fit the page
function rescaleWindow() {
  var windowHeight = Math.max(600, $(window).height());
  $('#container').css('height', Math.floor(windowHeight*.99)+'px');
  
  if(!isMobile()) {
    $("#container").css("position", "absolute");
    $("#container").css("top", "0");
    $("#particles-js").css("height", ($("#container").height())+"px");
  }
  else {
    $("#container").css("position", "static");
  }
  
  $('#title').css('margin-top', Math.floor(Math.max(50, 0.2*(windowHeight- $("#title").height() - $("#countdown").height() - $("#countdown").offset().top)))+'px');
  $('#access').css('margin-top', Math.floor(Math.max(50, 0.25*(windowHeight- $("#subtitle").height() - $("#subtitle").offset().top)))+'px');
  
  $('#how').css('padding-top', Math.floor(Math.max(50, 0.5*(windowHeight- $("#how").height() - $("#howContent").height())))+'px');
  $('#howContent').css('padding-bottom', Math.floor(Math.max(50, 0.5*(windowHeight- $("#how").height() - $("#howContent").height())))+'px'); 
  
  $('#contact').css('padding-top', Math.floor(Math.max(25, 0.5*(windowHeight- $("#contact").outerHeight() - $("#contactContent").outerHeight())))+'px');
  $('#contactContent').css('padding-bottom', Math.floor(Math.max(25, 0.5*(windowHeight- $("#contact").outerHeight() - $("#contactContent").outerHeight()-$("#bottom").outerHeight())))+'px');

}

// condition for mobile view
function isMobile() {
  return $("#particles-js").css("display")=="none" || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function countdown() {
  var now = Date.now();
  
  // Pre-registration
  if(now<registrationStart) {
    $("#registrationBegins").css("display", "block");
    $("#saleBegins").css("display", "none");
    $("#saleLive").css("display", "none");
    $("#registration").css("display", "none");
    $("#registrationCount").html(diffDate(now, registrationStart));
    $("#registrationDate").html(formatDate(registrationStart));
    $("#saleDate").html(formatDate(saleStart));
  }
  else {
    $("#registrationBegins").css("display", "none");
    $("#notification").css("display", "none");
    $("#registration").css("display", "block");
  
    // Pre-ICO
    if(now<saleStart) {
      $("#saleBegins").css("display", "block");
      $("#saleLive").css("display", "none");
      $("#saleCount").html(diffDate(now, saleStart));
    }
    // Post-ICO
    else {
      $("#saleBegins").css("display", "none");
      $("#saleLive").css("display", "block");
      updateMarketCap();
    }
  }
  
  setTimeout(countdown, 1000);
}

function diffDate(now, later) {
  var date1 = now;
  var date2 = later;

  var diff = date2.valueOf() - date1.valueOf();

  var days = Math.floor(diff / (1000 * 60 * 60 * 24));
  diff -=  days * (1000 * 60 * 60 * 24);

  var hours = Math.floor(diff / (1000 * 60 * 60));
  diff -= hours * (1000 * 60 * 60);

  var minutes = Math.floor(diff / (1000 * 60));
  diff -= minutes * (1000 * 60);

  var seconds = Math.floor(diff / (1000));
  diff -= seconds * (1000);
  
  return pad(days, 2)+"d : "+pad(hours, 2)+"h : "+pad(minutes, 2)+"m : "+pad(seconds, 2)+"s";
}

function pad (str, max) {
  str = str.toString();
  return str.length < max ? pad("0" + str, max) : str;
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

// Select a server at random to distribute load across the network
function selectServer(selectedServer) {
  if(selectedServer===undefined || selectedServer=='undefined' || selectedServer=="") {
    settings["rippleServer"] = servers[Math.floor(Math.random()*servers.length)];
  }
  else settings["rippleServer"] = selectedServer;
  console.log("Server selected: "+settings["rippleServer"]);
  api = new ripple.RippleAPI({server:settings["rippleServer"]});
}

// Update market cap of symbol
function updateMarketCap() {
    
    if(Date.now().valueOf()-lastMktCapUpdate<10*1000) return;
    else lastMktCapUpdate = Date.now().valueOf();
    
    var mktcap = 0;
    var price = 1;
    
    var currentOrderbook = null;
    var bridgedBook1 = null;
    var bridgedBook2 = null;
    
    new Promise(function(resolve, reject) { 
      try {
        if(api.isConnected()) {
          resolve();
        }
        else {
          console.log('Disconnected in updateMarketCap.');
          try {
            api.connect().then(function() {
                console.log("Reconnected in updateMarketCap.");
                resolve();
            }, function (err) {
              console.log("Failed to reconnect in updateMarketCap: "+err);
              resolve();
            });
          }
          catch (er) {
            console.log("Failed to reconnect in updateMarketCap: "+er);
            resolve();
          }
        }
      }
      catch (erx) {
        console.log("Error in updateMarketCap API connect: "+erx);
        resolve();
      }
    }, function(er) { console.log("Error in updateMarketCap reconnection: "+er); return null; })
    .then(function() {
      // Look up the issuer via API first
      //console.log("Fetching mktcap as obligation of "+issuer+"...");
      api.getBalanceSheet(issuer).then(function(sheet) {
        //console.log(sheet);
        if(sheet!=null && sheet.obligations!=null) {
          for(var i = 0; i<sheet.obligations.length; i++) {
            if(sheet.obligations[i].currency==symbol) {
              mktcap = parseFloat(sheet.obligations[i].value);
              console.log("Real-time marketcap: "+mktcap);
              break;
            }
          }
        }
      }, function(err) {console.log("Error mktcap getBalanceSheet: "+err);}).then(function() {

        // Look up using the Data API if the above fails
        if(mktcap==0) {
          var url = dataAPI+"/v2/capitalization/"+symbol+"+"+issuer+"?limit=1&descending=true";
          //console.log("No mktcap from issuer. Pulling data API: "+url);
          $.get( url, function( data ) {
              try {
                mktcap = parseFloat(stripHTML(data.rows[0].amount)).toFixed(0);
                console.log("Data API marketcap: "+mktcap);
              }
              catch (err) { 
                mktcap=0;
              }
          }, "json" );
        }
      }, function(err) {console.log("Error mktcap data API: "+err);})
      .then(function() {
        if(mktcap!=0) return api.getOrderbook(issuer, getPair(symbol, issuer, baseSymbol, baseIssuer), {limit:2}); 
        else return null;
      }, function (err) {
          console.log("Error in api.loadOrderbook: "+err);
          return null;
      })
      .then(function(orderbook) {
        currentOrderbook = orderbook;
        
        if(mktcap!=0) {
          return api.getOrderbook(issuer, getPair(symbol, issuer, "XRP", ""), {limit:2});
        }
        else return null;
      }, function (err) {
          console.log("Error in api.loadOrderbook for bridged quote 1: "+err);
          return null;
      }).then(function(orderbook1) {
      
          bridgedBook1 = orderbook1;

          if(bridgedBook1!=null) {
            return api.getOrderbook(issuer, getPair(baseSymbol, baseIssuer, "XRP", ""), {limit:2});
          }
          else {
            return null;
          }
        }, function (err) {
          console.log("Error in api.loadOrderbook for bridged quote 2: "+err);
          return null;
      }).then(function(orderbook2) {
          bridgedBook2 = orderbook2;
          
          // Combine the books
          try {
            if(bridgedBook1!=null && bridgedBook2!=null) {
              
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
                  }
                  else {
                     bid = (1.00000000*orderbook.bids[i].specification.totalPrice.value)/(1.00000000*orderbook.bids[i].specification.quantity.value);
                     counterparty = ""+orderbook.bids[i].specification.quantity.counterparty;
                     counterparty2 = ""+orderbook.bids[i].specification.totalPrice.counterparty;
                     q1=orderbook.bids[i].specification.quantity.value; 
                  }
                    
                    bids1[bids1.length] = {direction:orderbook.bids[i].specification.direction, counterparty:counterparty, counterparty2:counterparty2, qty:parseFloat(q1), symbol1:orderbook.bids[i].specification.quantity.currency, symbol2:orderbook.bids[i].specification.totalPrice.currency, price:(bid).toFixed(accuracy)};
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
                  }
                  else {
                     ask = (1.00000000*orderbook.asks[i].specification.totalPrice.value)/(1.00000000*orderbook.asks[i].specification.quantity.value);
                     counterparty = ""+orderbook.asks[i].specification.quantity.counterparty;
                     counterparty2 = ""+orderbook.asks[i].specification.totalPrice.counterparty;
                     q1=orderbook.asks[i].specification.quantity.value;
                  }
                  
                  // bridgedBook1 asks
                  asks1[asks1.length] = {direction:orderbook.asks[i].specification.direction, counterparty:counterparty, counterparty2:counterparty2, qty:parseFloat(q1), symbol1:orderbook.asks[i].specification.quantity.currency, symbol2:orderbook.asks[i].specification.totalPrice.currency, price:(ask).toFixed(accuracy)};
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
                    
                  }
                  else {
                     bid = (1.00000000*orderbook.bids[i].specification.totalPrice.value)/(1.00000000*orderbook.bids[i].specification.quantity.value);
                     counterparty = ""+orderbook.bids[i].specification.quantity.counterparty;
                     counterparty2 = ""+orderbook.bids[i].specification.totalPrice.counterparty;
                     q1=orderbook.bids[i].specification.quantity.value;
                     
                  }
                    
                    bids2[bids2.length] = {direction:orderbook.bids[i].specification.direction, counterparty:counterparty, counterparty2:counterparty2, qty:parseFloat(q1), symbol1:orderbook.bids[i].specification.quantity.currency, symbol2:orderbook.bids[i].specification.totalPrice.currency, price:(bid).toFixed(accuracy)};
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
                  }
                  else {
                     ask = (1.00000000*orderbook.asks[i].specification.totalPrice.value)/(1.00000000*orderbook.asks[i].specification.quantity.value);
                     counterparty = ""+orderbook.asks[i].specification.quantity.counterparty;
                     counterparty2 = ""+orderbook.asks[i].specification.totalPrice.counterparty;
                     q1=orderbook.asks[i].specification.quantity.value;
                  }
                  
                  // bridgedBook2 asks
                  asks2[asks2.length] = {direction:orderbook.asks[i].specification.direction, counterparty:counterparty, counterparty2:counterparty2, qty:parseFloat(q1), symbol1:orderbook.asks[i].specification.quantity.currency, symbol2:orderbook.asks[i].specification.totalPrice.currency, price:(ask).toFixed(accuracy)};
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
                    quantity: {currency:symbol, counterparty:issuer, value:totalSymbol1Sold},
                    totalPrice: {currency:baseSymbol, counterparty:baseIssuer, value:symbol2Received},
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
                    quantity: {currency:symbol, counterparty:issuer, value:totalSymbol1Sold},
                    totalPrice: {currency:baseSymbol, counterparty:baseIssuer, value:symbol2Received},
                    direction: "buy"
                  }
                };
                
                bids1[i].qty = symbol1Left;
                if(symbol1Left<=0) i++;
              }
              
            }
            
            orderbook = currentOrderbook;
            // Final processing of orderbook
            if(orderbook!=null) {

              var bids = [];
              var asks = [];
              
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
                    
                  }
                  else {
                     bid = (1.00000000*orderbook.bids[i].specification.totalPrice.value)/(1.00000000*orderbook.bids[i].specification.quantity.value);
                     counterparty = ""+orderbook.bids[i].specification.quantity.counterparty;
                     counterparty2 = ""+orderbook.bids[i].specification.totalPrice.counterparty;
                     q1=orderbook.bids[i].specification.quantity.value;
                     
                  }
                    
                    bids[bids.length] = {direction:orderbook.bids[i].specification.direction, counterparty:counterparty, counterparty2:counterparty2, qty:parseFloat(q1), symbol1:orderbook.bids[i].specification.quantity.currency, symbol2:orderbook.bids[i].specification.totalPrice.currency, price:(bid).toFixed(accuracy)};
                }
                
                // Ask side of the orderbook
                if(i< orderbook.asks.length && orderbook.asks[i].specification.quantity.value!=0) {
                  var row2 = ""; var ask = 0; var counterparty = ""; var counterparty2 = ""; var q1 = 0; var s1 = ""; var s2 = "";
                  if(orderbook.asks[i].state!=null && orderbook.asks[i].state.fundedAmount!=null && orderbook.asks[i].state.fundedAmount.value>0) {
                     ask = (1.00000000*orderbook.asks[i].specification.totalPrice.value)/(1.00000000*orderbook.asks[i].specification.quantity.value);
                     counterparty = ""+orderbook.asks[i].specification.quantity.counterparty;
                     counterparty2 = ""+orderbook.asks[i].specification.totalPrice.counterparty;
                     q1=orderbook.asks[i].state.fundedAmount.value;
                  }
                  else {
                     ask = (1.00000000*orderbook.asks[i].specification.totalPrice.value)/(1.00000000*orderbook.asks[i].specification.quantity.value);
                     counterparty = ""+orderbook.asks[i].specification.quantity.counterparty;
                     counterparty2 = ""+orderbook.asks[i].specification.totalPrice.counterparty;
                     q1=orderbook.asks[i].specification.quantity.value;
                  }
                  
                  asks[asks.length] = {direction:orderbook.asks[i].specification.direction, counterparty:counterparty, counterparty2:counterparty2, qty:parseFloat(q1), symbol1:orderbook.asks[i].specification.quantity.currency, symbol2:orderbook.asks[i].specification.totalPrice.currency, price:(ask).toFixed(accuracy)};
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

              
              // Update market price
              if(bids.length>0 && asks.length>0) price = (parseFloat(bids[0].price) + parseFloat(asks[0].price))/2;
              else if(bids.length>0) price = parseFloat(bids[0]);
              else if(asks.length>0) price = parseFloat(asks[0]);
              else price = 1;
              console.log("Market price: "+price);
            }
          }
          catch(ex) {
            console.log("Error combining bridged orderbooks: "+ex);
          }
      })
      .then(function() {
        $("#tokensIssued").html(nFormatter(mktcap, 2)+" @ $"+nFormatter(price, 2)+" "+baseSymbol);
      });
    });
}

// Build pair for orderbook lookup
function getPair(s1, i1, s2, i2) {
  var pair = {};
  pair.base = {};
  pair.counter = {};
  pair.base.currency = s1;
  pair.counter.currency = s2;
  
  if(i1!="" && s1!="XRP") pair.base.counterparty=i1;
  if(i2!="" && s2!="XRP") pair.counter.counterparty=i2;
  
  return pair;
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
  return $.trim(container.innerHTML); // innerHTML will be a xss safe string
}


// Page initiation block
$(document).ready(function() {

  if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) )
  {
  
  }
  else
    particlesJS.load('particles-js', 'particles.json', function() {
      console.log('callback - particles.js config loaded');
    });
  
  // Auto-resize the page when orientation changes (for phones)
  $( window ).on( "orientationchange", function( ) {
    rescaleWindow();
  });
  
  // Auto-resize if the window resizes as well
  window.onresize = rescaleWindow;
  
  // Disable form submission - we don't want to actually ever submit anything to the site
  $('#form').on('submit', function(e) {
      e.preventDefault();  //prevent form from submitting
      return false;
  });
  
  
  // Initial page fitting
  rescaleWindow();
  
  $("#symbol").val(symbol);
  $("#issuer").val(issuer);
  $("#directLink").attr("href", "https://www.theworldexchange.net/?symbol1="+symbol+"."+issuer+"&symbol2=XRP");
  $("#directLink").html("TheWorldExchange.Net/?symbol1="+symbol+"."+issuer.substring(0, 8)+"...");
  $("#tokenUrl").attr("href", "https://www.theworldexchange.net/?symbol1="+symbol+"."+issuer+"&symbol2="+baseSymbol+"."+baseIssuer);
  
  selectServer();
  
  countdown();
});