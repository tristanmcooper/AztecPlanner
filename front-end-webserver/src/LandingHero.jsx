export default function LandingHero({ onUploadClick, onStartFromScratch }) {
  return (
    <section className="mx-auto max-w-5xl px-4 pt-16 sm:pt-24 md:pt-28 text-center">
      <h1 className="text-[40px] sm:text-[56px] md:text-[64px] leading-tight font-extrabold">
        Plan Smarter. Party Harder.
      </h1>

      <p className="mt-9 text-lg sm:text-xl max-w-3xl mx-auto font-medium">
        AztecPlanner is your AI-powered course planner for SDSU, built to make
        academic planning intuitive, insightful, and actually fun.
      </p>

      <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
        {/* Upload button */}
        <button
          type="button"
          onClick={onUploadClick}
          className="h-[50px] min-w-[312px] rounded-md bg-[#A6192E] px-6 text-white text-lg font-medium hover:bg-[#8e1428] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]/60"
        >
          Upload Your Degree Audit
        </button>

        {/* Start Planning button */}
        <button
          type="button"
          onClick={onStartFromScratch}
          className="h-[50px] min-w-[312px] rounded-md bg-[#302B2B] px-6 text-white text-lg font-medium hover:bg-[#000000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]/60"
        >
          Start Planning From Scratch
        </button>
      </div>
    </section>
  );
}