// Everything here comes from the public GitHub README / repo READMEs of PRAVINKUMAR-2917. Do not add claims that are not verifiable there.
export const PROFILE = {
  name: 'Pravinkumar M', role: 'Data Analyst', github: 'PRAVINKUMAR-2917',
  linkedin: 'https://www.linkedin.com/in/pravinkumar2917',
  interests: ['chess', 'sudoku', 'logic', 'coding', 'gaming', 'pattern recognition'],
};
export const SKILLS: { group: string; items: string[] }[] = [
  { group: 'Languages', items: ['Python', 'SQL'] },
  { group: 'Data analysis and visualization', items: ['Pandas', 'Matplotlib', 'Seaborn'] },
  { group: 'Data wrangling and ETL', items: ['Excel', 'Power BI'] },
  { group: 'Database', items: ['MySQL'] },
  { group: 'Tools', items: ['Jupyter', 'VS Code'] },
];
export interface Project { name: string; summary: string; stack: string[]; fork?: boolean }
export const PROJECTS: Project[] = [
  { name: 'Attendance_Tracker', summary: 'Dynamic attendance tracker with automated monthly-to-yearly reporting and an interactive dashboard.', stack: ['Excel', 'Power Query', 'Power BI'] },
  { name: 'BlinkIT_Dashboard', summary: 'Excel dashboard for grocery sales: KPIs, category, outlet and location analysis with slicers and pivot charts.', stack: ['Excel'] },
  { name: 'ETL-MySQL-Data-Pipeline', summary: 'ETL pipeline that extracts e-commerce data from Excel, cleans it, loads it into MySQL and answers business questions with SQL.', stack: ['Jupyter Notebook', 'MySQL', 'SQL'] },
  { name: 'Neural_Nebula_040', summary: 'Airbnb price data processed in Python, loaded into MySQL, with a Power BI dashboard that updates from the database.', stack: ['Python', 'MySQL', 'Power BI'] },
  { name: 'Road_Accident_Report', summary: 'Road accident analysis: exploratory analysis in Python and an interactive Power BI dashboard on a cleaned CSV dataset.', stack: ['Python', 'Power BI'] },
  { name: 'Smart-Attendance-Salary-Automation-Dashboard', summary: 'Excel master attendance sheet connected to a Power BI dashboard for attendance and salary insights.', stack: ['Excel', 'Power BI'] },
  { name: 'Circular_Economy_Coders_', summary: 'E-commerce insights dashboard for sales, operations and marketing teams, built with Streamlit.', stack: ['Streamlit'], fork: true },
];
