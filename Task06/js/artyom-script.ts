interface Appointment {
    name: string,
    time: string,
    location: string
}

interface AppointmentBy {
    [_key: string]: Appointment
}

let commands: any[]

declare var Artyom: any;

window.addEventListener("load", function (): void {
    const artyom: any = new Artyom();

    let userName: string = "Jonas";
    let appointments: Appointment[] = [
        {
            name: "Vorlesung",
            time: "9",
            location: "Alfaview"
        },
        {
            name: "Meeting",
            time: "12",
            location: "Discord"
        },
        {
            name: "Treffen mit Paul",
            time: "15",
            location: "Cafe"
        }
    ];
    let appointmentsByName: AppointmentBy;

    artyom.addCommands({
        description: "Liste alle Termine",
        indexes: [/was habe ich heute vor/, /alle Termine/],
        smart: true,
        action: function (_i: number): void {
            artyom.say("Du hast heute vor: ");
            listAppointments(appointments);
        }
    });

    artyom.addCommands({
        description: "appointment X",
        indexes: ["* Termin"],
        smart: true,
        action: function (_i: number, _wildcard: string): void {
            appointmentByCounter(_wildcard);
        }
    });

    function start(): void {
        artyom.fatality();

        setTimeout(
            function (): void {
                artyom.initialize({
                    lang: "de-DE",
                    continuous: true,
                    listen: true,
                    interimResults: true,
                    debug: true
                }).then(function (): void {
                    console.log("Ready!");
                    artyom.say("Guten Morgen, Zeit aufzustehen. Es ist jetzt 8 Uhr. Für heute stehen mehrere Termine für dich an. Wenn du wissen willst was du heute geplant hast sag zum Beispiel 'Wie lautet mein erster Termin'");
                });
            },
            250);
    }

    mapAppointments();
    document.getElementById("start").addEventListener("click", start);

    function listAppointments(_appointments: Appointment[], _exclude: Appointment[] = []): void {
        let remainingAppointments: Appointment[] = appointments.filter(_value => !_exclude.includes(_value))
        for (const appointment of remainingAppointments) {
            listAppointment(appointment);
        }
        promptAskForDetails();
    }

    function listAppointment(_appointment: Appointment): void {
        artyom.say(_appointment.name);
    }

    function listAppointmentDetailed(_appointment: Appointment, time: boolean = true, location: boolean = true): void {
        artyom.say(_appointment.name);
        artyom.say("um " + _appointment.time + " Uhr");
        artyom.say("in " + _appointment.location);
    }

    function appointmentByCounter(_wildcard: string, _mentionedAppointments: Appointment[] = []) {
        let askedAppointment: Appointment;
        let appointmentNumber: string;

        let appointmentCounter: string[] = [
            "erster",
            "zweiter",
            "dritter"
        ]

        for (const key in appointmentCounter) {
            if (_wildcard.match(appointmentCounter[key])) {
                appointmentNumber = appointmentCounter[key];
                askedAppointment = appointments[key];
                break;
            }
        }

        if (!askedAppointment && _wildcard.match("letzter")) {
            appointmentNumber = "letzter";
            askedAppointment = appointments[appointments.length - 1];
        }

        if (askedAppointment) {
            _mentionedAppointments.push(askedAppointment);
            artyom.say(`Dein ${appointmentNumber} Termin lautet: `);
            listAppointmentDetailed(askedAppointment);
            promptNextAppointment(_mentionedAppointments);
        }
        else {
            artyom.say("Das habe ich nicht Verstanden.");
        }
    }

    function promptNextAppointment(_mentionedAppointments: Appointment[]): void {
        let remainingAppointments: Appointment[] = appointments.filter(_value => !_mentionedAppointments.includes(_value));
        let randomSuggestion: string = [
            "'Wie lautet mein nächster Termin'",
            "'Was habe ich noch vor'",
            "'Wie lautet mein zweiter Termin'",
        ][Math.floor(Math.random() * 4)];
        let question: string = `Du hast noch ${remainingAppointments.length == 1 ? "einen weiteren Termin" : (remainingAppointments.length + " weitere Termine")}. Wenn du wissen willst was du noch vor hast `;
        if (_mentionedAppointments.length <= 2) {
            question += `sag zum Beispiel ${randomSuggestion}`;
        } else {
            question += "frag einfach nach";
        }

        if (remainingAppointments.length > 0) {
            artyom.newPrompt({
                question: question,
                smart: true,
                options: [/nächster Termin/, /((sonst noch)|(sonst)|(noch) vor)|(weiteren|anderen Termine)/, "* Termin", /^[Ss]topp?$/],
                beforePrompt: () => {
                    artyom.dontObey();
                },
                onEndPrompt: () => {
                    artyom.obey();
                },
                onMatch: (_index: number, _wildcard: string) => {
                    switch (_index) {
                        case 0:
                            _mentionedAppointments.push(remainingAppointments[0]);
                            return () => {
                                listAppointmentDetailed(remainingAppointments[0]);
                                promptNextAppointment(_mentionedAppointments);
                            }
                        case 1:
                            return () => {
                                artyom.say("Deine anderen Termine lauten: ");
                                listAppointments(remainingAppointments, _mentionedAppointments);
                            }
                        case 2:
                            return () => appointmentByCounter(_wildcard, _mentionedAppointments);
                        default:
                            return () => {
                                stop();
                            };
                    }
                }
            });
        }
        else {
            promptAskForDetails();
        }
    }

    function promptAskForDetails(_promptCounter: number = 0, _appointmentFound: boolean = true): void {
        let randomSuggestion: string = [
            `'Wo findet ${appointments[0].name} statt?'`,
            `'Wann findet ${appointments[2].name} statt?'`,
        ][Math.floor(Math.random() * 2)];
        let question: string = `${_appointmentFound ? "" : "Das habe ich nicht Verstanden."} Wenn du ${_promptCounter < 1 ? "genauere" : "weitere"} Informationen zu deinen Terminen haben willst `
        if (_promptCounter < 1)
            question += `sag zum Beispiel ${randomSuggestion}`;
        else
            question += "frag einfach nach";

        artyom.newPrompt({
            question: question,
            smart: true,
            options: ["Wo *", "Wann *", /^[Ss]topp?$/],
            beforePrompt: () => {
                artyom.dontObey();
            },
            onEndPrompt: () => {
                artyom.obey();
            },
            onMatch: (_index: number, _wildcard: string) => {
                let askedAppointment: Appointment;
                for (const key in appointmentsByName) {
                    let match = _wildcard.match(key.toLocaleLowerCase());
                    if (match) {
                        console.log(match);
                        askedAppointment = appointmentsByName[key];
                        break;
                    }
                }

                _promptCounter++;

                if (!askedAppointment && _index <= 1)
                    return () => {
                        promptAskForDetails(_promptCounter, false);
                    }

                switch (_index) {
                    case 0:
                        return () => {
                            artyom.say(`Dein Termin ${askedAppointment.name} findet in ${askedAppointment.location} statt`);
                            if (_promptCounter < 3)
                                promptAskForDetails(_promptCounter);
                        }
                    case 1:
                        return () => {
                            artyom.say(`Dein Termin ${askedAppointment.name} ist um ${askedAppointment.time} Uhr`);
                            if (_promptCounter < 3)
                                promptAskForDetails(_promptCounter);
                        }
                    default:
                        return () => {
                            stop();
                        };
                }
            }
        });
    }

    function stop(): void {
        artyom.say("Okay ich hoffe ich konnte dir behilflich sein")
    }

    function mapAppointments(): void {
        appointmentsByName = {};
        for (const appointment of appointments) {
            appointmentsByName[appointment.name] = appointment;
        }
    }
});

