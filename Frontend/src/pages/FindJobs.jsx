import React from 'react';
import HeroSearch from '../components/jobs/HeroSearch';
import JobFilterSidebar from '../components/jobs/JobFilterSidebar';
import JobCard from '../components/jobs/JobCard';

// Dummy data bridging the HTML mockups
const MOCK_JOBS = [
  {
    id: 1,
    title: 'Barista — Morning Shift',
    company: 'The Coffee House',
    location: 'District 1',
    description: 'Prepare and serve specialty coffee drinks. Maintain cleanliness and provide excellent customer service during morning rush hours.',
    type: 'Part-time',
    shift: 'Morning',
    category: 'F&B',
    salary: 35000,
    timePosted: '2h ago',
    icon: 'local_cafe',
    iconBg: 'from-amber-400 to-orange-500 shadow-amber-200/40'
  },
  {
    id: 2,
    title: 'Math Tutor — High School',
    company: 'EduStar Center',
    location: 'Thu Duc City',
    description: 'Teach high school mathematics to groups of 5-8 students. Previous tutoring experience and strong math skills required.',
    type: 'Part-time',
    shift: 'Evening',
    category: 'Tutoring',
    salary: 80000,
    timePosted: '5h ago',
    icon: 'school',
    iconBg: 'from-blue-400 to-indigo-500 shadow-blue-200/40'
  },
  {
    id: 3,
    title: 'Delivery Driver — GrabFood',
    company: 'Grab Vietnam',
    location: 'Binh Thanh District',
    description: 'Deliver food orders within the district. Must have own motorbike and smartphone. Flexible hours, earn based on deliveries.',
    type: 'Flexible',
    shift: 'Afternoon',
    category: 'Delivery',
    salary: 40000,
    timePosted: '1d ago',
    icon: 'delivery_dining',
    iconBg: 'from-green-400 to-emerald-500 shadow-green-200/40'
  },
  {
    id: 4,
    title: 'Sales Assistant — Weekend',
    company: 'Uniqlo Vietnam',
    location: 'Saigon Centre',
    description: 'Assist customers with product selection, maintain store displays, and handle checkout during peak weekend hours.',
    type: 'Part-time',
    shift: 'Weekend',
    category: 'Retail',
    salary: 30000,
    timePosted: '1d ago',
    icon: 'storefront',
    iconBg: 'from-pink-400 to-rose-500 shadow-pink-200/40'
  },
  {
    id: 5,
    title: 'Social Media Marketing Intern',
    company: 'DigiAds Agency',
    location: 'Remote',
    description: 'Manage social media accounts, create engaging content, and analyze campaign performance. Great opportunity for marketing enthusiasts.',
    type: 'Internship',
    shift: 'Remote',
    category: 'Marketing',
    salary: 50000,
    timePosted: '3d ago',
    icon: 'campaign',
    iconBg: 'from-violet-400 to-purple-500 shadow-violet-200/40'
  },
  {
    id: 6,
    title: 'Waiter/Waitress — Japanese Restaurant',
    company: 'Sushi Hokkaido',
    location: 'District 7',
    description: 'Serve customers in a premium Japanese dining setting. Must be friendly, fast, and able to handle up-tempo service. Tips included.',
    type: 'Part-time',
    shift: 'Evening',
    category: 'F&B',
    salary: 32000,
    timePosted: '4d ago',
    icon: 'restaurant',
    iconBg: 'from-teal-400 to-cyan-500 shadow-teal-200/40'
  },
  {
    id: 7,
    title: 'Event Photographer — Freelance',
    company: 'SnapEvent Studio',
    location: 'District 3',
    description: 'Cover corporate events, weddings, and parties. Must own professional camera equipment. Portfolio required for application.',
    type: 'Freelance',
    shift: 'Weekend',
    category: 'Creative',
    salary: 150000,
    timePosted: '5d ago',
    icon: 'photo_camera',
    iconBg: 'from-yellow-400 to-amber-500 shadow-yellow-200/40'
  },
  {
    id: 8,
    title: 'Gym Receptionist — Morning',
    company: 'California Fitness',
    location: 'District 10',
    description: 'Welcome gym members, handle check-ins, manage scheduling, and assist with membership inquiries. Friendly personality required.',
    type: 'Part-time',
    shift: 'Morning',
    category: 'Service',
    salary: 28000,
    timePosted: '6d ago',
    icon: 'fitness_center',
    iconBg: 'from-red-400 to-orange-500 shadow-red-200/40'
  },
  {
    id: 9,
    title: 'Data Entry Clerk — Remote',
    company: 'VietData Corp',
    location: 'Remote',
    description: 'Enter and verify data in spreadsheets and databases. Must have fast typing speed (60+ WPM) and attention to detail.',
    type: 'Part-time',
    shift: 'Remote',
    category: 'Office',
    salary: 45000,
    timePosted: '1w ago',
    icon: 'computer',
    iconBg: 'from-slate-500 to-slate-700 shadow-slate-300/40'
  }
];

export default function FindJobs() {
  return (
    <div className="bg-slate-50 min-h-screen">
      <HeroSearch />
      
      <main className="max-w-[1320px] mx-auto px-6 lg:px-10 py-10 grid lg:grid-cols-[280px_1fr] gap-8">
        <JobFilterSidebar />
        
        <section>
          {/* Sort bar */}
          <div className="anim-fadeUp-d1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <p className="text-sm text-slate-500">Showing <span className="font-semibold text-slate-800">142</span> jobs</p>
            <div className="flex items-center gap-3">
              <select className="text-sm border border-slate-200 rounded-xl px-3 h-10 bg-white focus:ring-primary/30 focus:border-primary outline-none cursor-pointer">
                <option>Most Recent</option>
                <option>Highest Pay</option>
                <option>Closest</option>
                <option>Most Popular</option>
              </select>
              <div className="flex border border-slate-200 rounded-xl overflow-hidden">
                <button className="w-10 h-10 flex items-center justify-center bg-primary text-white"><span className="material-symbols-outlined !text-xl">grid_view</span></button>
                <button className="w-10 h-10 flex items-center justify-center bg-white text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined !text-xl">view_list</span></button>
              </div>
            </div>
          </div>

          {/* Job Grid */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {MOCK_JOBS.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-10 flex items-center justify-center gap-2">
            <button className="w-10 h-10 rounded-xl border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors"><span className="material-symbols-outlined !text-xl">chevron_left</span></button>
            <button className="w-10 h-10 rounded-xl bg-primary text-white text-sm font-bold shadow-md shadow-primary/20">1</button>
            <button className="w-10 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors">2</button>
            <button className="w-10 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors">3</button>
            <span className="text-slate-400 text-sm">…</span>
            <button className="w-10 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors">16</button>
            <button className="w-10 h-10 rounded-xl border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors"><span className="material-symbols-outlined !text-xl">chevron_right</span></button>
          </div>
        </section>
      </main>
    </div>
  );
}
