# **CS 495 - Multi-User Physiological Computing**

This repository represents a semester long project for CS 495 at The University of Alabama. The repository is forked from a previous semester's work. The original README can be found in [the archive](archive/flyworld/README.md).

**Project team members:** Trenton Ottman, Zara Ahmed, James Adler, Ansel Stinnett, and Jackson Wallace.

**Project stakeholder:** Dr. Chris S. Crawford

## Project Goal

The goal of this project is to develop a web-based, real-time multiplayer game controlled by physiological input devices. The game takes heavy inspiration from the existing Pico Park, and our version is called PhysioPark. We aim to have a full set of levels at the end of the semester. The game is designed to provide an engaging and accessible experience that allows K-12 students to participate with minimal technical or gameplay experience.

## Project Status

Previous work has established a single-player experience using a physiological input device. This project extends that work by developing a real-time multiplayer experience capable of supporting multiple physiological input devices simultaneously.

The project is currently in the fine-tuning phase after the creation of two levels utilizing the Phaser Typescript framework. Documentation has been completed regarding the game design, technical architecture, and technologies required to support the multiplayer experience. It is possible to create both public and private lobbies with a controlled maximum player amount. Local testing can be done using localhost:5173, but this project is also deployed on Google Cloud.

## Major Features

Known major features of the finished project currently include:
- **Browser-based:** The game can be played directly in a web browser.
- **Multiplayer:** Supports 2–12 players using physiological input devices simultaneously.
- **Physiological input:** Uses forearm muscle activity as the primary gameplay input.
- **Real-time interaction:** Supports real-time communication and interaction between players.
- **Classroom accessibility:** Designed to be approachable and engaging for K-12 students in a classroom environment.
- **Two levels:** Utilizes simple platforming and cooperative puzzle-solving for a minimum of two players.
- **Lobby Creation:** Supports public and private lobbies with default & user-entered display names.

## Project Management

The project is managed through [this repository](https://github.com/TrentonOttman/CS495-MultiUserPhysioGaming) and the associated [GitHub Project](https://github.com/users/TrentonOttman/projects/1).

Group communication is done by text message, Teams, Discord, and in-person.

## Documentation — Handoff

**Recipient:** Dr. Crawford has informed us our hand-off will be directed to Simeon Herrod & Daniel Zheng following the conclusion of this semester. Our team has met with these two students and informed them of current progress and future plans. They have been added to this repository.

Durable documentation intended for users, sponsors, future developers, deployers, and maintainers lives under [`docs/`](docs/):
- [Development Guide](docs/development-guide/)
- [User Guide](docs/user-guide/)
- [Deployment Guide](docs/deployment-guide/)
- [Testing Plan](docs/testing/test-plan.md)
- [Project Handoff FAQ](docs/faq/)
- [Security](docs/security/)
- [Decisions](docs/decisions/)
- [Investigations](docs/investigations/)
- [Recommendations](docs/recommendations/)

## Course / Process Records
Semester-specific records live under [`course/`](course/):
- presentation PDFs under `course/presentations/`
- iteration planning, review, and retrospective documents under `course/iterations/iteration-N/`

These records remain in version control for grading/history but are separate from the handoff documentation set. Formal stand-ups are GitHub Issues/comments, not Markdown files.

## Testing

Currently, no testing procedure has been set up beyond running _npm test_ and manual gameplay testing.

## Iteration Submission Tags

- `iteration-1-submission`
- `iteration-2-submission`
- `iteration-3-submission`
