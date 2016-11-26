var shop = function(options) {
	this.options = options;
	
	//setup shopify
	this._shopifyClient = ShopifyBuy.buildClient({
	  apiKey: options.apiKey,
	  domain: options.domain,
	  appId: '6'
	});
	
	//setup rivets
	rivets.formatters.link = function(id, type) {
		return '#!/'+type+'/'+id;
	}
	
	//setup objects
	this._data = {
		"cartUI": {
			lineItemCount: 0,
			subtotal: 0
		}
	};
	
	this._setupCart();
	this._navigate();
	this._getCategories();
	
	window.addEventListener('hashchange', this._navigate.bind(this));
	
	document.querySelector(options.productEl).style.display = 'none';
	document.querySelector(options.collectionEl).style.display = 'none';
	document.querySelector(options.menuEl).style.display = 'none';
	
	rivets.bind(document.querySelector(options.collectionEl), this._data);
	rivets.bind(document.querySelector(options.productEl), this._data);
	rivets.bind(document.querySelector(this.options.cartEl), this._data);
	rivets.bind(document.querySelector(this.options.buyPopout), this._data);
	rivets.bind(document.querySelector(this.options.menuEl), this._data);
};

shop.prototype._setupCart = function() {
	if(this._getCookie('cartID') == '') {
		this._shopifyClient.createCart().then(function (newCart) {
			this._data["cart"] = newCart;
			this._data["cartUI"] = newCart;
			var now = new Date();
			var time = now.getTime();
			var expireTime = time + 1000*36000;
			now.setTime(expireTime);
			document.cookie = 'cartID='+this._data["cart"].id+'; expires='+now.toGMTString()+'; path=/';
		}.bind(this));
	} else {
		this._shopifyClient.fetchCart(this._getCookie('cartID')).then(function (newCart) {
			this._data["cart"] = newCart;
			this._data["cartUI"]["lineItemCount"] = newCart.lineItemCount;
			this._data["cartUI"]["subtotal"] = newCart.subtotal;
			this._data["cartUI"]["lineItems"] = newCart.lineItems;
			this._data["cartUI"]["checkoutUrl"] = newCart.checkoutUrl;
		}.bind(this));
	}
}

shop.prototype._getCookie = function(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length,c.length);
        }
    }
    return "";
};

shop.prototype._getProduct = function(id) {
	document.querySelector(this.options.collectionEl).style.display = "none";
	document.querySelector(this.options.menuEl).style.display = "none";
	document.querySelector(this.options.loaderEl).style.display = "";
	this._shopifyClient.fetchProduct(id)
	.then(function (prod) {
		this._data["product"] = prod;
		this._data["product"]["buy"] = function(e) {
			var target = e.target;
			while(target.className.indexOf('variant') < 0) {
				target = target.parentElement;
			}
			var variant;
			for(var i = 0; i < this._data.product.variants.length; i++) {
				var v = this._data.product.variants[i];
				if(v.id == target.id) {
					variant = v;
				}
			}
			console.log(variant);
			this._data["cart"].createLineItemsFromVariants({variant: variant, quantity: 1}).then(function(cart) {
				this._data["cartUI"]["lineItemCount"] = cart.lineItemCount;
				this._data["cartUI"]["subtotal"] = cart.subtotal;
				this._data["cartUI"]["lineItems"] = cart.lineItems;
				this._data["cartUI"]["checkoutUrl"] = cart.checkoutUrl;
			}.bind(this));
		}.bind(this);
		
		document.querySelector(this.options.productEl).style.display = "";
		document.querySelector(this.options.loaderEl).style.display = "none";
	}.bind(this))
	.catch(function () {
		console.log('Request failed');
	});
}

shop.prototype._getCategories = function() {
	this._shopifyClient.fetchAllCollections()
	.then(function(coll) {
		this._data["collections"] = coll;
		if(this.home) {
			this._getHomeCollection();
		}
	}.bind(this));
}

shop.prototype._getCategory = function(id) {
	document.querySelector(this.options.collectionEl).style.display = "none";
	document.querySelector(this.options.productEl).style.display = "none";
	document.querySelector(this.options.loaderEl).style.display = "";
	this._shopifyClient.fetchCollection(id).then(function(coll) {
		this._data["collection"] = coll;
		this._shopifyClient.fetchQueryProducts({ collection_id: id }).then(function(items) {
			this._data["collection"]["items"] = items;
			document.querySelector(this.options.menuEl).style.display = "";
			document.querySelector(this.options.collectionEl).style.display = "";
			document.querySelector(this.options.loaderEl).style.display = "none";
		}.bind(this));
	}.bind(this));
}

shop.prototype._navigate = function() {
	this.home = false;
	var parts = window.location.hash.split("/");
	if(parts[1] == "product") {
		this._getProduct(parts[2]);
	} else if(parts[1] == "category") {
		this._getCategory(parts[2]);
	} else if((parts.length < 3 && parts[1] == "") || parts.length < 2) {
		this.home = true;
		this._getHomeCollection();
	} else {
		//todo: 404;
	}
}

shop.prototype._getHomeCollection = function() {
	if(this._data["collections"]) {
		for(var i = 0; i < this._data["collections"].length; i++) {
			if(this._data["collections"][i].attrs.handle == "frontpage") {
				this._getCategory(this._data["collections"][i].attrs.collection_id);
			}
		}
	}
}

shop.prototype.clearCart = function() {
	this._data["cart"].clearLineItems()
	.then(function(cart) {
		this._data["cartUI"]["lineItemCount"] = cart.lineItemCount;
		this._data["cartUI"]["subtotal"] = cart.subtotal;
		this._data["cartUI"]["lineItems"] = cart.lineItems;
		this._data["cartUI"]["checkoutUrl"] = cart.checkoutUrl;
	}.bind(this));
}