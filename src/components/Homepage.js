import React from 'react';
import MessCard from './messcard';
import WomenMode from './WomenMode';
import VegNonVegToggle from './VegNonveg';

const Homepage = () => {
  return (
    <div>
      <MessCard />
      <WomenMode />
      <VegNonVegToggle />
    </div>
  );
};

export default Homepage; 