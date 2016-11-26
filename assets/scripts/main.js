var shopClient = ShopifyBuy.buildClient({
  apiKey: '06fcef78b0593bdb201323de56809000',
  domain: 'ms-jetoapple.myshopify.com',
  appId: '6'
});

rivets.formatters.link = function(id, type) {
	return '#!/'+type+'/'+id;
}

var cart = {};
var cartBinding;
var product     = {};
var productBinding;
var collection  = {};
var collectionBinding;
var collections = {};
var home = false;

function getCookie(cname) {
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
}

function setupCart() {
	if(getCookie('cartID') == '') {
		shopClient.createCart().then(function (newCart) {
			cart = newCart;
			var now = new Date();
			var time = now.getTime();
			var expireTime = time + 1000*36000;
			now.setTime(expireTime);
			document.cookie = 'cartID='+cart.id+'; expires='+now.toGMTString()+'; path=/';
			cartBinding = rivets.bind(document.querySelector('#cart'), cart);

		});
	} else {
		shopClient.fetchCart(getCookie('cartID')).then(function (newCart) {
			cart = newCart;
			cartBinding = rivets.bind(document.querySelector('#cart'), cart);
		});
	}
}

function getProduct(id) {
	document.querySelector('#collection').style.display = "none";
	document.querySelector('#menu').style.display = "none";
	document.querySelector('#loader-pencil-content').style.display = "";
	shopClient.fetchProduct(id)
	.then(function (prod) {
		product["body_html"] = prod.body_html;
		product["images"] = prod.images;
		product["description"] = prod.description;
		product["title"] = prod.title;
		product["variants"] = prod.variants;
		product.buy = buy;
		document.querySelector('#product').style.display = "";
		document.querySelector('#loader-pencil-content').style.display = "none";
	})
	.catch(function () {
		console.log('Request failed');
	});
}

function getCategories() {
	shopClient.fetchAllCollections()
	.then(function(coll) {
		collections.items = coll;
		rivets.bind(document.querySelector('#menu'), collections);
		if(home) {
			getHomeCollection();
		}
	});
}

function getCategory(id) {
	document.querySelector('#collection').style.display = "none";
	document.querySelector('#product').style.display = "none";
	document.querySelector('#loader-pencil-content').style.display = "";
	shopClient.fetchCollection(id).then(function(coll) {
		document.querySelector('#menu').style.display = "";
		collection["title"] = coll.attrs.title;
		collection["body_html"] = coll.attrs.body_html || "";
		document.querySelector('#collection').style.display = "";
		shopClient.fetchQueryProducts({ collection_id: id }).then(function(items) {
			if(!collection.items) {
				collection.items = [];
			} else {
				collection.items.splice(0, collection.items.length);
			}
			for(var i = 0; i < items.length; i++) {
				collection.items.push(items[i]);
			}
			document.querySelector('#loader-pencil-content').style.display = "none";
		});
	});
}

function initSite() {
	setupCart();
	navigate();
	getCategories();
	window.addEventListener('hashchange', navigate);
	document.querySelector('#product').style.display = 'none';
	document.querySelector('#collection').style.display = 'none';
	document.querySelector('#menu').style.display = 'none';
	
	rivets.bind(document.querySelector('#collection'), collection);
	rivets.bind(document.querySelector('#product'), product);
}

function navigate() {
	home = false;
	var parts = window.location.hash.split("/");
	if(parts[1] == "product") {
		getProduct(parts[2]);
	} else if(parts[1] == "category") {
		getCategory(parts[2]);
	} else if((parts.length < 3 && parts[1] == "") || parts.length < 2) {
		home = true;
		getHomeCollection();
	} else {
		//todo: 404;
	}
}

function getHomeCollection() {
	if(collections.items) {
		for(var i = 0; i < collections.items.length; i++) {
			if(collections.items[i].attrs.handle == "frontpage") {
				getCategory(collections.items[i].attrs.collection_id);
			}
		}
	}
}

function buy(e) {
	var target = e.target;
	while(target.className.indexOf('variant') < 0) {
		target = target.parentElement;
	}
	var variant;
	for(var i = 0; i < product.variants.length; i++) {
		var v = product.variants[i];
		if(v.id == target.id) {
			variant = v;
		}
	}
	cart.createLineItemsFromVariants({variant: variant, quantity: 1}).then(function() {
		console.log(cart);
		cartBinding.sync();
	});
}

function clearCart() {
	cart.clearLineItems()
	.then(function() {
		cartBinding.sync();
	});
}