import type { TerminalData } from "~/types";

const terminal: TerminalData[] = [
  {
    id: "about",
    title: "about",
    type: "folder",
    children: [
      {
        id: "about-me",
        title: "intro.txt",
        type: "file",
        content: (
          <div className="py-1">
            <div>
              Hi, this is Dominic. I am a Software Engineer and Frontend Developer.
            </div>
          </div>
        )
      },
      {
        id: "about-interests",
        title: "interests.txt",
        type: "file",
        content: "MERN Stack / Open Source Contribution  / full stack developement"
      },
      {
        id: "about-who-cares",
        title: "who-cares.txt",
        type: "file",
        content:
          "I'm looking for a SDE internship. I'm open to collaboration on full stack projects."
      },
      {
        id: "about-contact",
        title: "contact.txt",
        type: "file",
        content: (
          <ul className="list-disc ml-6">
            <li>
              Email:{" "}
              <a
                className="text-blue-300"
                href="mailto:dominic.wokorach-o@outlook.com"
                target="_blank"
                rel="noreferrer"
              >
                dominic.wokorach-o@outlook.com
              </a>
            </li>
            <li>
              Github:{" "}
              <a
                className="text-blue-300"
                href="https://github.com/domwokorach"
                target="_blank"
                rel="noreferrer"
              >
                @domwokorach
              </a>
            </li>
            <li>
              Linkedin:{" "}
              <a
                className="text-blue-300"
                href="https://www.linkedin.com/in/dominic-w-3673523b/"
                target="_blank"
                rel="noreferrer"
              >
                Dominic
              </a>
            </li>
            <li>
              Personal Website:{" "}
              <a
                className="text-blue-300"
                href="https://portfolio-wokorach.vercel.app/"
                target="_blank"
                rel="noreferrer"
              >
                https://portfolio-wokorach.vercel.app/
              </a>
            </li>
            <li>
              X:{" "}
              <a
                className="text-blue-300"
                href="https://x.com/do3inic"
                target="_blank"
                rel="noreferrer"
              >
               find me on x.com
              </a>
            </li>
          </ul>
        )
      }
    ]
  },
  {
    id: "about-dream",
    title: "my-dream.cpp",
    type: "file",
    content: (
      <div className="py-1">
        <div>
          <span className="text-yellow-400">while</span>(
          <span className="text-blue-400">sleeping</span>) <span>{"{"}</span>
        </div>
        <div>
          <span className="text-blue-400 ml-9">money</span>
          <span className="text-yellow-400">++</span>;
        </div>
        <div>
          <span>{"}"}</span>
        </div>
      </div>
    )
  }
];

export default terminal;
