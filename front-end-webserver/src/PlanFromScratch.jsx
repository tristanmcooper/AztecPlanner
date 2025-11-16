import { useNavigate } from "react-router-dom";

export default function PlanFromScratch() {
  const navigate = useNavigate();

  const handleGoToPlanner = () => {
    navigate("/planner");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
            {/* Back Arrow */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-20 left-4 text-3xl text-gray-900 hover:text-black"
        aria-label="Go back to landing page"
      >
        ←
      </button>
      <h1 className="text-3xl font-bold mb-6">Plan From Scratch</h1>
      <p className="text-gray-700 mb-6 text-center max-w-lg">
        Start building your degree plan manually from here. You can add courses,
        organize semesters, and explore options to meet your graduation requirements.
      </p>
      <button
        onClick={handleGoToPlanner}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
      >
        Go to Planner
      </button>
    </div>
  );
}