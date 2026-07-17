import type { WebsitesData } from "~/types";

const websites: WebsitesData = {
  favorites: {
    title: "Contact links",
    sites: [
      {
        id: "my-email",
        title: "Email",
        img: "img/sites/gmail.svg",
        link: "mailto:dominic.wokorach-O@outlook.com",
      },
      {
        id: "my-github",
        title: "Github",
        img: "img/sites/github.svg",
        link: "https://github.com/domwokorach",
      },
      {
        id: "my-linkedIn",
        title: "LinkedIn",
        img: "img/sites/linkedin.svg",
        link: "https://www.linkedin.com/in/dominic-w-3673523b/",
      },
      {
        id: "my-x",
        title: "X",
        img: "img/sites/twitter.svg",
        link: "https://x.com/do3inic",
      },
      // {
      //   id: "leetcode",
      //   title: "LeetCode",
      //   img: "img/sites/leetcode.svg",
      //   link: "https://leetcode.com/u/aakashsharma_03/",
      // },
      // {
      //   id: "GeeksforGeeks",
      //   title: "GeeksforGeeks",
      //   img: "img/sites/gfg.png",
      //   link: "https://www.geeksforgeeks.org/user/demaxxer/",
      // },
    ],
  },
  freq: {
    title: "Visited my projects",
    sites: [
      {
        id: "wokorach-weather",
        title: "Weather",
        img: "/img/sites/weather.svg",
        link: "https://wokorach-weather.vercel.app/",
      },
      {
        id: "fifa-world-cup-26-sigma",
        title: "FIFA World Cup 26 Sigma",
        img: "img/sites/WC26.svg",
        link: "https://fifa-world-cup-26-sigma.vercel.app/",
      },
      {
        id: "wokorach-gemini-ai",
        title: "Gemini AI",
        img: "img/sites/gemini.svg",
        link: "https://wokorach-gemini-ai.vercel.app/",
      },
      {
        id: "ui-ux-halifax-piggy-bank",
        title: "UI/UX - Halifax Piggy Bank",
        img: "img/sites/halifax-piggy-bank.svg",
        link: "https://xd.adobe.com/view/24335fc2-505b-4b60-6c6c-37d0d258bf9d/",
      },
      // {
      //   id: "GeeksforGeeks",
      //   title: "GeeksforGeeks",
      //   img: "img/sites/gfg.png",
      //   link: "https://www.geeksforgeeks.org/",
      // },
    ],
  },
};

export default websites;
