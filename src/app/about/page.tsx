import React from "react";

const AboutPage = () => (
  <div className="min-h-screen bg-blue-200 text-blue-900 pt-8">
    <h1 className="text-2xl text-center font-bold mb-6">ℹ️ About</h1>
    <section className="max-w-2xl mx-auto bg-yellow-50 border-4 border-black shadow-window-pixel p-6 text-center">
      <p className="mb-4 text-lg font-bold">HackPredict</p>
      <p className="mb-4">AI-powered prediction markets for hackathon projects, built with a playful late-90s pixel-UI aesthetic.</p>
      <p className="mb-4">Created by <span className="text-blue-600 font-bold">Ahmet Baran Aktan</span>, <span className="text-blue-600 font-bold">Yunus Emre Malkoç</span>, <span className="text-blue-600 font-bold">İbrahim Halil Bakışmaz</span>, and <span className="text-blue-600 font-bold">Mehmet Göktuğ Karoğlu</span>.</p>
      <p className="text-xs text-blue-700">Powered by Next.js, Tailwind CSS, and a love for retro web design.</p>
    </section>
  </div>
);

export default AboutPage;
