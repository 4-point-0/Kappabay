"use client";

"use client";

import UploadDb from '../components/UploadDb';
import RetrieveDb from '../components/RetrieveDb';

const HomePage = () => {
  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <h1 className="text-3xl font-bold">Kappabay Terminal Next</h1>
      <UploadDb />
      <RetrieveDb />
    </div>
  );
};

export default HomePage;
