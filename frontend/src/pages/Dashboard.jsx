const Dashboard = () => (
  <div className="p-10 mt-12 grid grid-cols-2 gap-6">
    {['Recent Summaries', 'New Upload', 'Citation Tracker', 'Saved Library'].map(section => (
      <div key={section} className="p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition duration-200 cursor-pointer">
        <h2 className="font-bold text-2xl">{section}</h2>
        <p className="mt-2">Quickly navigate and manage your research activities.</p>
      </div>
    ))}
  </div>
);

  export default Dashboard;
  