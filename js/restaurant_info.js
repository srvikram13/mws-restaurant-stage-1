let restaurant, reviews;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  DBHelper.initDB();
  initMap();
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
      const map = document.querySelector("#map-container");
      document.querySelector("#map").style.height = map.offsetHeight+"px";

      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
          mapboxToken: 'pk.eyJ1Ijoic3J2aWtyYW0xMyIsImEiOiJjamlhbTIzenAxOHJzM2twZmYyM3RveHozIn0.qT1B02p-3OGRHbr9IHjDjQ',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'    
      }).addTo(newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}  
 
/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(parseInt(id), (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });

    DBHelper.fetchReviewsByRestaurantId(parseInt(id), (error, reviews) => {
      self.reviews = reviews;
      if(!reviews) {
        console.error(error);
        return;
      }
      fillReviewsHTML();
    })
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const picture = document.getElementById('restaurant-img');
  picture.innerHTML = `<source media="(min-width: 600px)" srcset="${DBHelper.smallImageUrlForRestaurant(restaurant)}">
    <source media="(max-width: 400px)" srcset="${DBHelper.smallImageUrlForRestaurant(restaurant)}">
    <source media="(min-width: 401px) and (max-width: 599px)" srcset="${DBHelper.bigImageUrlForRestaurant(restaurant)}">
    <img class="restaurant-img" src="${DBHelper.bigImageUrlForRestaurant(restaurant)}" alt="${restaurant.name}">`;


  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  btnAddToFav = document.querySelector("#addToFav");
  btnRemoveFromFav = document.querySelector("#removeFromFav");
  
  [btnAddToFav, btnRemoveFromFav].forEach((element) => {
    element.addEventListener("click", (event)=> {
      let state = false;
      if(event.target === btnAddToFav) {
        state = true;
      }
      DBHelper.toggleFavorite(self.restaurant.id, state, (error, response) => {
        if(error) {
          console.error(error);
          return;
        }
        if(event.target === btnAddToFav) {
          btnAddToFav.style.display = "none";
          btnRemoveFromFav.style.display = "block";
        } else {
          btnAddToFav.style.display = "block";
          btnRemoveFromFav.style.display = "none";
        }
      });
    });
  });

  if(restaurant.is_favorite == "true") {
    btnAddToFav.style.display = "none";
    btnRemoveFromFav.style.display = "block";
  } else {
    btnAddToFav.style.display = "block";
    btnRemoveFromFav.style.display = "none";
  }
  
  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key].replace(",", "<br>");
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  const btnAddReview = document.createElement("A");
  btnAddReview.href = `javascript:addReview()`;
  btnAddReview.innerHTML = "Add Review";
  btnAddReview.classList.add("button");
  container.appendChild(btnAddReview);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.innerHTML = `<div class='review'><div class='review-head'>${review.name} <span>Last Updated: ${new Date(review.updatedAt).toLocaleDateString()}</span></div><p class='rating'>${getRating(review.rating)}</p><p>${review.comments}</p></div>`;
  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}
getRating = (rating) => {
  let str = '';
  for(let i = 1; i <= 5; i++) {
    if(i <= rating) str += '★';
    else str += '☆';
  }
  return str;
}
/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

addReview = () => {
  let reviewForm = document.querySelector("#review-form-container");
  reviewForm.style.display = "block";
  reviewForm = reviewForm.querySelector('form');
}
editReview = () => {

}
deleteReview = () => {

}
cancelReview = () => {
  let reviewForm = document.querySelector("#review-form-container");
  reviewForm.style.display = "none";
  reviewForm = reviewForm.querySelector('form');
  reviewForm.reset();

}
postReview = () => {
  let reviewForm = document.querySelector("#review-form-container");
  reviewForm = reviewForm.querySelector('form'); 
  const formData =  {
    "restaurant_id": self.restaurant.id,
    "name": document.querySelector("#review-name").value,
    "rating": parseInt(document.querySelector("input[name='review-rating']:checked").value),
    "comments": document.querySelector("#review-comments").value
}
  //formData.append("restaurant_id", parseInt());
  DBHelper.saveReview(JSON.stringify(formData), (error, review) => {
    if(!error) {
      const ul = document.getElementById('reviews-list');
      ul.appendChild(createReviewHTML(review));
      cancelReview();
      return;
    }
    alert("There was an error trying to post the review. We'll try again later.");
  });

  return false;
}