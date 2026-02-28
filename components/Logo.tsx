import React from 'react';

// ==========================================
// HOW TO CHANGE THE LOGO:
// 1. Upload your image to an image hosting site (like imgur.com) and copy the "Direct Link" (ending in .png or .jpg).
// 2. Paste that link inside the quotes below where the current URL is.
// 
// ALTERNATIVELY (for local files):
// 1. Go to a site like https://www.base64-image.de/ and upload your picture.
// 2. Click "Copy Image" or "Copy CSS" to get the "data:image/..." string.
// 3. Paste that massive string inside the quotes below.
// ==========================================

const LOGO_URL = "https://i.imgur.com/8NZwFQl.png";

const Logo: React.FC = () => {
  return (
    <img 
        src={LOGO_URL}
        alt="University of Shatt Al-Arab Logo" 
        className="w-full h-full object-cover"
    />
  );
};

export default Logo;