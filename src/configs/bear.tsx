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
        file: "https://raw.githubusercontent.com/Renovamen/oh-my-cv/main/README.md",
        icon: "i-ri:newspaper-fill",
        excerpt: "Write your curriculum vitae / resume in Markdown online...",
        link: "https://drive.google.com/file/d/1XNdEjtUgk8fUnqaJ0fkABxp1WEQxpbYz/view?usp=drive_link"
      },
      {
        id: "Weather API",
        title: "Weather API",
        file: "https://raw.githubusercontent.com/Renovamen/oh-vue-icons/master/README.md",
        icon: "i-simple-icons:typescript",
        excerpt: "Importing icons from different icon packs in Vue easily...",
        link: "https://oh-vue-icons.js.org"
      },
      {
        id: "F1 Track Replay",
        title: "F1 Track Replay",
        file: "https://raw.githubusercontent.com/Renovamen/metallic/master/README.md",
        icon: "i-simple-icons:python",
        excerpt: "A meta-learning library base on PyTorch...",
        link: "https://github.com/Renovamen/metallic"
      },
      {
        id: "News API",
        title: "News API",
        file: "https://raw.githubusercontent.com/Renovamen/vuepress-theme-gungnir/main/README.md",
        icon: "i-simple-icons:javascript",
        excerpt: "A simple and beautiful blog theme for VuePress...",
        link: "https://vuepress-theme-gungnir.vercel.app"
      },
      {
        id: "Election UI",
        title: "Election UI",
        file: "https://raw.githubusercontent.com/Renovamen/Text-Classification/master/README.md",
        icon: "i-simple-icons:javascript",
        excerpt: "Election implementation of text classification models...",
        link: "https://github.com/Renovamen/Text-Classification"
      },
      {
        id: "Air Quality",
        title: "Air Quality",
        file: "https://raw.githubusercontent.com/Renovamen/Speech-Emotion-Recognition/master/README.md",
        icon: "i-simple-icons:javascript",
        excerpt: "Speech emotion recognition using Keras and sklearn...",
        link: "https://github.com/Renovamen/Speech-Emotion-Recognition"
      }
    ]
  }
];

export default bear;
