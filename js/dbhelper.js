/**
 * Common database helper functions.
 */
class DBHelper {

  static get IDB_NAME () { return 'restaurants-db'; }
  static get IDB_VERSION () { return 1; }

  static initDB() {
    if (!('indexedDB' in window)) {
      console.log('This browser doesn\'t support IndexedDB');
      return;
    }
    
    this.dbPromise = idb.open(this.IDB_NAME, this.IDB_VERSION, function(upgradeDb) {
      if (!upgradeDb.objectStoreNames.contains('restaurants')) {
        var peopleOS = upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
        peopleOS.createIndex('id', 'id', {unique: true});
        peopleOS.createIndex('neighborhood', 'neighborhood', {unique: false});
      }
      if (!upgradeDb.objectStoreNames.contains('reviews')) {
        var notesOS = upgradeDb.createObjectStore('reviews', {autoIncrement: true});
        notesOS.createIndex('title', 'title', {unique: false});
      }
    });
  }

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `//localhost:${port}/restaurants`;
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
    let url = DBHelper.DATABASE_URL;
    fetch(url)
      .then((response) => response.json())
      .then((restaurants) => {
        const tx = dbref.transaction('restaurants', 'readwrite');
        for(let restaurant of restaurants) {
          tx.objectStore('restaurants').put(restaurant);
        }
        callback(null, restaurants);
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
      console.log("id", id);
      return index.get(id);
    }).then(function(restaurant) {
      console.log("restaurant", restaurant)
      if(restaurant) {
        callback(null, restaurant)
        return;
      }
      fetch(DBHelper.DATABASE_URL+`/`+id)
        .then((response) => response.json())
        .then((restaurant) => {
            const tx = dbref.transaction('restaurants', 'readwrite');
            tx.objectStore('restaurants').put(restaurant);
            // return tx.complete;
            callback(null, restaurant);
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

}

