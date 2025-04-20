import React, { useState } from "react";
import "./VegNonVegToggle.css";

const VegNonVegToggle = () => {
  const [isVeg, setIsVeg] = useState(false);

  const toggleVegNonVeg = () => {
    setIsVeg(!isVeg);
  };

  return (
    <div className="veg-nonveg-container">
      <span>{isVeg ? "Veg" : "Non-Veg"}</span>
      <div 
        className={`veg-toggle-switch ${isVeg ? "veg" : ""}`} 
        onClick={toggleVegNonVeg}
      >
        <div className="veg-toggle-circle"></div>
      </div>
    </div>
  );
};

export default VegNonVegToggle;
