import type { BearData } from "~/types";

const bear: BearData[] = [
  {
    id: "profile",
    title: "Profile",
    icon: "i-fa-solid:code",
    md: [
      {
        id: "about-me",
        title: "About Me",
        file: "markdown/about-me.md",
        icon: "i-la:dragon",
        excerpt: "Hey there! I'm a dragon lost in human world..."
      },
      {
        id: "github-stats",
        title: "Github Stats",
        file: "markdown/github-stats.md",
        icon: "i-icon-park-outline:github",
        excerpt: "Here are some status about my github account..."
      },
      {
        id: "about-site",
        title: "About This Site",
        file: "markdown/about-site.md",
        icon: "i-octicon:browser",
        excerpt: "Something about this personal portfolio site..."
      }
    ]
  },
  {
    id: "project",
    title: "Projects",
    icon: "i-octicon:repo",
    md: [
      {
        id: "portfolio-macos",
        title: "Portfolio macOS",
        file: "https://raw.githubusercontent.com/domwokorach/Portfolio-Wokorach/refs/heads/master/README.md",
        icon: "i-ri:macbook-line",
        excerpt: "My portfolio website simulating macOS's GUI...",
        link: "https://github.com/domwokorach/Portfolio-Wokorach"
      },
      {
        id: "oh-my-cv",
        title: "Oh, My CV!",
        file: "https://raw.githubusercontent.com/domwokorach/domiic_resume/refs/heads/master/README.md",
        icon: "i-ri:newspaper-fill",
        excerpt: "Write your curriculum vitae / resume in Markdown online...",
        link: "https://cv-resume-lilac.vercel.app/"
      },
      {
        id: "Weather API",
        title: "Weather API",
        file: "https://raw.githubusercontent.com/domwokorach/wokorach-weather/refs/heads/master/README.md",
        icon: "i-simple-icons:typescript",
        excerpt: "Importing icons from different icon packs in Vue easily...",
        link: "https://wokorach-weather.vercel.app/"
      },
      {
        id: "F1 Track Replay",
        title: "F1 Track Replay",
        file: "https://raw.githubusercontent.com/domwokorach/Wokorach-f1-track-replay/refs/heads/master/README.md",
        icon: "i-simple-icons:python",
        excerpt:
          "A Python application for visualizing Formula 1 and replaying race events...",
        link: "https://github.com/domwokorach/Wokorach-f1-track-replay"
      },
      {
        id: "News API",
        title: "News API",
        file: "https://raw.githubusercontent.com/domwokorach/Wokorac-News-API/refs/heads/master/README.md",
        icon: "i-simple-icons:javascript",
        excerpt: "NewsAPI requests made directly from the browser...",
        link: "https://wokorach-news-api.vercel.app/"
      },
      {
        id: "Election UI",
        title: "Election UI",
        file: "https://raw.githubusercontent.com/domwokorach/elections-api/refs/heads/master/README.md",
        icon: "i-simple-icons:javascript",
        excerpt: "Election implementation of text classification models...",
        link: "https://elections-api-yaz3.vercel.app/"
      },
      {
        id: "Air Quality",
        title: "Air Quality",
        file: "https://raw.githubusercontent.com/domwokorach/wokorach-air-quality/refs/heads/master/README.md",
        icon: "i-simple-icons:javascript",
        excerpt: "My solution for the Air Quality code test, built with Gridsome...",
        link: "https://wokorach-air-quality.vercel.app/en/"
      },
      {
        id: "World Map API",
        title: "World Map",
        file: "https://raw.githubusercontent.com/domwokorach/Wokorach-Map/master/README.md",
        icon: "i-simple-icons:map",
        excerpt: "Built with Next.js and Weather API, it offers a seamle...",
        link: "https://github.com/domwokorach/Wokorach-Map.git"
      },
      {
        id: "Wokorach MacBook",
        title: "Wokorach MacBook",
        file: "https://raw.githubusercontent.com/domwokorach/wokorach_mackbook/refs/heads/master/README.md",
        icon: "i-simple-icons:macbook",
        excerpt: "A macOS-inspired web application...",
        link: "https://wokorach-macbook.vercel.app/"
      },
      {
        id: "Gemini AI",
        title: "Gemini AI",
        file: "https://raw.githubusercontent.com/domwokorach/Wokorach-Gemini-AI/refs/heads/master/README.md",
        icon: "i-simple-icons:gemini",
        excerpt: "A macOS-inspired web application...",
        link: "https://wokorach-gemini-ai.vercel.app/"
      }
    ]
  }
];

export default bear;
