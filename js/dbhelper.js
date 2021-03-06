/**
 * Common database helper functions.
 */
class DBHelper {

  static get IDB_NAME () { return 'restaurants-db'; }
  static get IDB_VERSION () { return 2; }

  static initDB() {
    if (!('indexedDB' in window)) {
      console.log('This browser doesn\'t support IndexedDB');
      return;
    }
    
    this.dbPromise = idb.open(this.IDB_NAME, this.IDB_VERSION, function(upgradeDb) {
      if (!upgradeDb.objectStoreNames.contains('restaurants')) {
        var restaurantOS = upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
        restaurantOS.createIndex('id', 'id', {unique: true});
        restaurantOS.createIndex('neighborhood', 'neighborhood', {unique: false});
      }
      if (!upgradeDb.objectStoreNames.contains('reviews')) {
        var reviewsOS = upgradeDb.createObjectStore('reviews', {keyPath: 'id'});
        reviewsOS.createIndex('restaurant_id', 'restaurant_id', {unique: false});
      }
    });
  }

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `//localhost:${port}`;
  }

  static get RESTAURANTS_URL() {
    return this.DATABASE_URL + "/restaurants";
  }
  static get REVIEWS_URL() {
    return this.DATABASE_URL + "/reviews";
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    let dbref;
    this.dbPromise.then(function(db) {
      dbref = db;
      var tx = db.transaction('restaurants', 'readonly');
      var store = tx.objectStore('restaurants');
      return store.getAll();
    }).then(function(restaurants) {
      if(restaurants && restaurants.length) {
        callback(null, restaurants)
        return;
      }
    let url = DBHelper.RESTAURANTS_URL;
    fetch(url)
      .then((response) => response.json())
      .then((restaurants) => {
        const tx = dbref.transaction('restaurants', 'readwrite');
        for(let restaurant of restaurants) {
          tx.objectStore('restaurants').put(restaurant);
        }
        callback(null, restaurants);
        DBHelper.resumeQueuedRequests();
      })
      .catch((error) => {
        callback(error, null);
      });
    });
  }
  
  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    let dbref;
    this.dbPromise.then(function(db) {
      dbref = db;
      var tx = db.transaction('restaurants', 'readonly');
      var store = tx.objectStore('restaurants');
      var index = store.index('id');
      return index.get(id);
    }).then(function(restaurant) {
      if(restaurant) {
        callback(null, restaurant)
        return;
      }
      fetch(DBHelper.RESTAURANTS_URL+`/`+id)
        .then((response) => response.json())
        .then((restaurant) => {
            const tx = dbref.transaction('restaurants', 'readwrite');
            tx.objectStore('restaurants').put(restaurant);
            // return tx.complete;
            callback(null, restaurant);
            DBHelper.resumeQueuedRequests();
        })
        .catch((error) => {
          callback(error, null);
        });
    }).catch((error) => {
      console.log("error occured ", error)
    });
  }

  static fetchReviewsByRestaurantId(id, callback) {
    let dbref;
    this.dbPromise.then(function(db) {
      dbref = db;
      var tx = db.transaction('reviews', 'readonly');
      var store = tx.objectStore('reviews');
      var index = store.index('restaurant_id');
      return index.getAll(id);
    }).then(function(reviews) {
      if(reviews && reviews.length) {
        callback(null, reviews)
        return;
      }
      fetch(DBHelper.REVIEWS_URL+`?restaurant_id=`+id)
        .then((response) => response.json())
        .then((reviews) => {
            const tx = dbref.transaction('reviews', 'readwrite');
            reviews.forEach(review => {
              tx.objectStore('reviews').put(review);
            })
            // return tx.complete;
            DBHelper.resumeQueuedRequests();
            callback(null, reviews);
        })
        .catch((error) => {
          callback(error, null);
        });
    }).catch((error) => {
      console.log("error occured ", error)
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  static saveReview(formdata, callback) {
    let dbref;
    fetch(DBHelper.REVIEWS_URL, {method: "POST", body: formdata})
      .then((response) => response.json())
      .then((review)=> {
        this.dbPromise.then(function(db) {
          dbref = db;
          const tx = dbref.transaction('reviews', 'readwrite');
          tx.objectStore('reviews').put(review);
        });
        callback(null, review)
        DBHelper.resumeQueuedRequests();
      }).catch((error) => {
        DBHelper.queueRequest(DBHelper.REVIEWS_URL, "POST", formdata);
        callback(error, null)
      });
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}`);
  }
  static smallImageUrlForRestaurant(restaurant) {
    let arr;
    if(restaurant.photograph) {
      arr = restaurant.photograph.split(".");
    } else {
      arr = ["placeholder"];
    }
    return (`/images/${arr[0]}-small.jpg`);
    return (`/images/${arr[0]}-small.${arr[1]}`);
  }
  static bigImageUrlForRestaurant(restaurant) {
    let arr;
    if(restaurant.photograph) {
      arr = restaurant.photograph.split(".");
    } else {
      arr = ["placeholder"];
    }
    return (`/images/${arr[0]}-medium.jpg`);
    return (`/images/${arr[0]}-medium.${arr[1]}`);
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  } 
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */
  static toggleFavorite(id, state, callback) {
    const scope = this;
    const url = DBHelper.RESTAURANTS_URL + '/'+id+'?is_favorite='+state;
    fetch(url, {method: "PUT"})
      .then((response) => response.json())
      .then((restaurant) => {
        if(!restaurant) {
          console.error("error");
          return;
        }
        scope.dbPromise.then((db) => {
          const tx = db.transaction('restaurants', 'readwrite');
          tx.objectStore('restaurants').put(restaurant);
        })
        callback(null, restaurant);
        DBHelper.resumeQueuedRequests();
      }).catch((error) => {
        callback(error, null);
        DBHelper.queueRequest(url, "PUT");
      });
  }
  static queueRequest(url, method, payload) {
    let count = parseInt(localStorage.getItem("count"));
    if(!count) {
      count = 1;
    }
    count++;
    localStorage.setItem("count", count);
    localStorage.setItem(count, JSON.stringify({url: url, method: method, body: (payload ? payload : "") }));
  }
  static resumeQueuedRequests() {
    //console.log("in resumeQueuedRequests");
    if(localStorage.length) {
      const target = JSON.parse(localStorage.getItem(localStorage.key(0)));
      if(target && target.url && target.method && target.body) {
        fetch(target.url, {method: target.method, body: target.body})
          .then((response)=> response.json())
          .then((response) => {
            localStorage.removeItem(localStorage.key(0));
            DBHelper.resumeQueuedRequests();
          })
      }
    }
  }
}

