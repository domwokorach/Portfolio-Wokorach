import type { BearData } from "~/types";

const bear: BearData[] = [
  {
    id: "profile",
    title: "Profile",
    icon: "i-ph:paw-print",
    md: [
      {
        id: "about-me",
        title: "About Me",
        file: "markdown/about-me.md",
        icon: "i-ph:shield-star",
        excerpt: "Hey there! I'm the one who is building his own universe..."
      },
      {
        id: "github-stats",
        title: "Github Stats",
        file: "markdown/github-stats.md",
        icon: "i-fa6-brands:github",
        excerpt: "Here are some status about my github account..."
      },
      {
        id: "about-site",
        title: "About This Site",
        file: "markdown/about-site.md",
        icon: "i-ph:browser",
        excerpt: "Something about this personal portfolio site..."
      }
    ]
  },
  {
    id: "project",
    title: "Projects",
    icon: "i-ph:git-branch",
    md: [
      {
        id: "weather-application",
        title: "Weather Application",
        file: "https://raw.githubusercontent.com/domwokorach/wokorach-weather/master/README.md",
        icon: "i-ph:cloud-sun",
        excerpt: "A weather application built with React...",
        link: "https://github.com/domwokorach/wokorach-weather"
      },
      // {
      //   id: "fifa-world-cup-26-sigma",
      //   title: "FIFA World Cup 26 Sigma",
      //   file: "https://github.com/domwokorach/FIFA-World-Cup-26/edit/master/README.md",
      //   icon: "i-ph:desktop",
      //   excerpt: "FIFA World Cup 26 Sigma project...",
      //   link: "https://github.com/domwokorach/fifa-world-cup-26-sigma"
      // },
      {
        id: "medium-2.0",
        title: "Medium 2.0",
        file: "https://raw.githubusercontent.com/aakashsharma003/Medium/main/README.md",
        icon: "i-ph:globe",
        excerpt: "A medium modified version with serverless backend...",
        link: "https://github.com/aakashsharma003/Medium"
      },
      {
        id: "attendance-web",
        title: "Gemini AI",
        file: "https://raw.githubusercontent.com/domwokorach/wokorach-gemini-ai/master/README.md",
        icon: "i-ph:clipboard-text",
        excerpt: "An AI application built with Gemini...",
        link: "https://github.com/domwokorach/wokorach-gemini-ai"
      },
      {
        id: "fx-risk",
        title: "FX Risk",
        file: "https://raw.githubusercontent.com/domwokorach/fx-risk-dashboard/master/README.md",
        icon: "i-ph:figma-logo",
        excerpt: "A financial risk management dashboard...",
        link: "https://fx-risk-dashboard.vercel.app/"
      }
    ]
  }
];

export default bear;
