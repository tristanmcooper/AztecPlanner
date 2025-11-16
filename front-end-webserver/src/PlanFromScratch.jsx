import React from "react";
import { useNavigate } from "react-router-dom";

export default function PlanFromScratch() {
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    // If you want to pass values to /planner:
    // const data = Object.fromEntries(new FormData(e.currentTarget));
    // navigate("/planner", { state: data });
    navigate("/planner");
  }

  return (
    <main className="mx-auto max-w-[1280px] px-4" role="main">

      {/* Back Arrow */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-20 left-4 text-3xl text-gray-900 hover:text-black"
        aria-label="Go back to landing page"
      >
        ←
      </button>

      {/* Heading + subtitle */}
      <section className="text-center mt-12">
        <h2 className="text-5xl font-bold text-black mb-6 mt-28 text-center">
          Plan From Scratch
        </h2>
        <p className="mt-9 text-lg sm:text-xl max-w-3xl mx-auto font-medium">
          Fill in the information below so we can help you start planning.
        </p>
      </section>

      {/* Card */}
      <section className="mx-auto mt-6 w-[675px] max-w-full">
        <div className="border-2 border-black rounded-[10px] p-6 min-h-[330px]">
          <form onSubmit={handleSubmit} className="grid gap-5">
            {/* First Name */}
            <div className="grid gap-2">
              <label htmlFor="firstName" className="text-2xl font-normal text-black">
                First Name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                placeholder="Enter your first name"
                className="border border-black rounded-md px-3.5 py-2.5 text-lg text-black placeholder-black/50
                           focus:outline-none focus:ring-2 focus:ring-black/20"
              />
            </div>

            {/* Last Name */}
            <div className="grid gap-2">
              <label htmlFor="lastName" className="text-2xl font-normal text-black">
                Last Name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                placeholder="Enter your last name"
                className="border border-black rounded-md px-3.5 py-2.5 text-lg text-black placeholder-black/50
                           focus:outline-none focus:ring-2 focus:ring-black/20"
              />
            </div>

            {/* Major */}
            <div className="grid gap-2">
              <label htmlFor="major" className="text-2xl font-normal text-black">
                Major
              </label>
              <input
                id="major"
                name="major"
                type="text"
                required
                placeholder="e.g. Computer Science"
                className="border border-black rounded-md px-3.5 py-2.5 text-lg text-black placeholder-black/50
                           focus:outline-none focus:ring-2 focus:ring-black/20"
              />
            </div>

            {/* Continue button (117×40, #939393) */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="w-[117px] h-10 bg-[#A6192E] text-white rounded-md text-base font-medium
                           hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black/50"
              >
                Continue
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}