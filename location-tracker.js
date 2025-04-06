document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");
  const coordinatesDisplay = document.getElementById("coordinates");
  const zoomInButton = document.getElementById("zoom-in");
  const zoomOutButton = document.getElementById("zoom-out");
  const refreshButton = document.getElementById("refresh-location");
  const loadingIndicator = document.getElementById("loading-indicator");

  // Map initialization
  let map = null;
  let currentLocationMarker = null;
  let currentPosition = null;
  const defaultZoom = 13;
  const defaultLocation = [40.7128, -74.006]; // New York City as fallback

  // Initialize the map with a default location
  function initMap(location) {
    // Create map instance
    map = L.map("map", {
      center: location,
      zoom: defaultZoom,
      zoomControl: false, // We'll use our custom zoom controls
      attributionControl: true,
    });

    // Add custom styled tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add custom marker for current location
    addLocationMarker(location);

    // Set up event listeners for map
    map.on("click", handleMapClick);
  }

  // Add a marker for the current location with custom styling
  function addLocationMarker(location) {
    // Remove existing marker if it exists
    if (currentLocationMarker) {
      map.removeLayer(currentLocationMarker);
    }

    // Create custom marker icon
    const pulseIcon = L.divIcon({
      className: "marker-pulse-container",
      html: '<div class="marker-pulse"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    // Add marker to map
    currentLocationMarker = L.marker(location, { icon: pulseIcon }).addTo(map);

    // Add a circle to show accuracy (can be adjusted based on actual accuracy data)
    L.circle(location, {
      color: "rgba(0, 242, 254, 0.3)",
      fillColor: "rgba(0, 242, 254, 0.1)",
      fillOpacity: 0.5,
      radius: 500,
    }).addTo(map);
  }

  // Get user's current location
  function getCurrentLocation() {
    showLoading(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        // Success callback
        (position) => {
          currentPosition = [
            position.coords.latitude,
            position.coords.longitude,
          ];

          // Update coordinates display
          updateCoordinatesDisplay(currentPosition);

          // Initialize map if it doesn't exist, otherwise update it
          if (!map) {
            initMap(currentPosition);
          } else {
            map.setView(currentPosition, map.getZoom());
            addLocationMarker(currentPosition);
          }

          showLoading(false);
        },
        // Error callback
        (error) => {
          console.error("Error getting location:", error);
          handleLocationError(error);
          showLoading(false);

          // Use default location if geolocation fails
          if (!map) {
            initMap(defaultLocation);
          }
        },
        // Options
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    } else {
      // Browser doesn't support geolocation
      handleLocationError({ code: 0, message: "Geolocation not supported" });
      showLoading(false);

      // Use default location if geolocation is not supported
      if (!map) {
        initMap(defaultLocation);
      }
    }
  }

  // Handle location errors
  function handleLocationError(error) {
    let message = "";
    switch (error.code) {
      case 1:
        message = "Permission denied. Please allow location access.";
        break;
      case 2:
        message = "Location unavailable. Please try again later.";
        break;
      case 3:
        message = "Location request timed out. Please try again.";
        break;
      default:
        message = "Unable to get your location. Using default location.";
    }

    // Update coordinates display with error message
    coordinatesDisplay.textContent = message;

    // Use default location
    updateCoordinatesDisplay(defaultLocation);
  }

  // Update coordinates display
  function updateCoordinatesDisplay(coords) {
    const [lat, lng] = coords;
    const latDirection = lat >= 0 ? "N" : "S";
    const lngDirection = lng >= 0 ? "E" : "W";

    coordinatesDisplay.textContent = `Latitude: ${Math.abs(lat).toFixed(4)}° ${latDirection}, Longitude: ${Math.abs(lng).toFixed(4)}° ${lngDirection}`;
  }

  // Show/hide loading indicator
  function showLoading(show) {
    if (show) {
      loadingIndicator.classList.add("active");
    } else {
      loadingIndicator.classList.remove("active");
    }
  }

  // Handle map click
  function handleMapClick(e) {
    const { lat, lng } = e.latlng;
    updateCoordinatesDisplay([lat, lng]);
    addLocationMarker([lat, lng]);
  }

  // Search for locations using OpenStreetMap Nominatim API
  async function searchLocation(query) {
    if (!query.trim()) {
      searchResults.classList.remove("active");
      return;
    }

    try {
      showLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
      );
      const data = await response.json();

      // Display search results
      displaySearchResults(data);
      showLoading(false);
    } catch (error) {
      console.error("Error searching for location:", error);
      showLoading(false);
    }
  }

  // Display search results
  function displaySearchResults(results) {
    // Clear previous results
    searchResults.innerHTML = "";

    if (results.length === 0) {
      searchResults.innerHTML =
        '<div class="search-result-item">No results found</div>';
      searchResults.classList.add("active");
      return;
    }

    // Create result items
    results.slice(0, 5).forEach((result) => {
      const resultItem = document.createElement("div");
      resultItem.className = "search-result-item";
      resultItem.textContent = result.display_name;

      // Add click event to select this location
      resultItem.addEventListener("click", () => {
        const coords = [parseFloat(result.lat), parseFloat(result.lon)];

        // Update map view
        map.setView(coords, defaultZoom);
        addLocationMarker(coords);

        // Update coordinates display
        updateCoordinatesDisplay(coords);

        // Clear search results
        searchResults.classList.remove("active");
        searchInput.value = result.display_name;
      });

      searchResults.appendChild(resultItem);
    });

    searchResults.classList.add("active");
  }

  // Event Listeners
  zoomInButton.addEventListener("click", () => {
    if (map) map.zoomIn();
  });

  zoomOutButton.addEventListener("click", () => {
    if (map) map.zoomOut();
  });

  refreshButton.addEventListener("click", getCurrentLocation);

  searchInput.addEventListener(
    "input",
    debounce((e) => {
      searchLocation(e.target.value);
    }, 500),
  );

  // Close search results when clicking outside
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.classList.remove("active");
    }
  });

  // Utility function for debouncing
  function debounce(func, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // Initialize the application
  getCurrentLocation();
});
