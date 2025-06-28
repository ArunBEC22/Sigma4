const axios = require("axios");

async function validateAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&addressdetails=1`;

  const response = await axios.get(url, {
    headers: {
      "User-Agent": "WanderlustApp (arun@email.com)"
    }
  });

  const data = response.data;

  if (data.length > 0) {
    const result = data[0];
    const {
      display_name,
      lat,
      lon,
      importance,
      class: cls,
      type,
      address: addressDetails
    } = result;


    // Ensure result is in India
    const isInIndia =
      display_name.toLowerCase().includes("india") ||
      (addressDetails && addressDetails.country_code === "in");

    const allowed = (
      importance >= 0.3 &&
      isInIndia &&
      (
        cls === "place" ||
        (cls === "boundary" && type === "administrative") ||
        ["city", "town", "village", "hamlet", "suburb", "residential"].includes(type)
      )
    );

    if (allowed && display_name && lat && lon) {
      return {
        valid: true,
        formattedAddress: display_name,
        location: { lat, lon }
      };
    }
  }

  return { valid: false };
}

module.exports = validateAddress;
