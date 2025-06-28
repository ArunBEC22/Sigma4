// updateListings.js

const mongoose = require("mongoose");
const axios = require("axios");
const Listing = require("./models/listing"); // Adjust the path if needed
require("dotenv").config();

const ATLASDB_URL = process.env.ATLASDB_URL;

// Clean categories: Add hyphen in multi-word ones
const CATEGORY_FIXES = {
  "Amazing Pools": "Amazing-Pools",
  "Iconic Cities": "Iconic-Cities",
  "Historical Homes": "Historical-Homes"
};

async function getGeoData(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&q=${encodeURIComponent(query)}`;
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "WanderlustApp (your@email.com)"
      }
    });
    if (response.data.length > 0) {
      const place = response.data[0];
      return {
        formattedAddress: place.display_name,
        coordinates: {
          lat: place.lat,
          lon: place.lon
        }
      };
    }
  } catch (err) {
    console.error(`❌ Failed to get data for ${query}:`, err.message);
  }
  return null;
}

async function updateListings() {
  await mongoose.connect(ATLASDB_URL);
  console.log("🔗 Connected to MongoDB");

  const listings = await Listing.find({});
  console.log(`📦 Found ${listings.length} listings to process...`);

  for (const listing of listings) {
    let updated = false;

    // ✅ Fix category hyphenation
    if (CATEGORY_FIXES[listing.category]) {
      console.log(`🔧 Updating category: ${listing.category} → ${CATEGORY_FIXES[listing.category]}`);
      listing.category = CATEGORY_FIXES[listing.category];
      updated = true;
    }

    // ✅ Add address & coordinates if missing
    if (!listing.formattedAddress || !listing.coordinates) {
      const fullQuery = `${listing.location || ""}, ${listing.country || ""}`;
      const geoData = await getGeoData(fullQuery);

      if (geoData) {
        listing.formattedAddress = geoData.formattedAddress;
        listing.coordinates = geoData.coordinates;
        console.log(`📍 Updated location for ${listing.title}`);
        updated = true;
      } else {
        console.warn(`⚠️ Skipped geocoding for: ${listing.title}`);
      }

      // Sleep 1 second to respect Nominatim's rate limit
      await new Promise((res) => setTimeout(res, 1000));
    }

    if (updated) {
      await listing.save();
      console.log(`✅ Saved updates for: ${listing.title}`);
    }
  }

  console.log("🎉 All listings processed.");
  await mongoose.connection.close();
  console.log("🔒 Connection closed.");
}

updateListings();
