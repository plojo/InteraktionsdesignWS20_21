window.addEventListener("load", function () {
    const artyom = new Artyom();
    let appointments = [
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
        },
        {
            name: "Besprechung mit Team",
            time: "18",
            location: "Skype"
        },
        {
            name: "Serien anschauen",
            time: "20",
            location: "Netflix"
        }
    ];
    let appointmentsByName;
    let suggestions1 = [
        "'Was habe ich noch vor'",
        "'Wie lautet mein dritter Termin'",
        "'Wie lautet mein nächster Termin'"
    ];
    let suggestions2 = [
        `'Wann findet ${appointments[4].name} statt?'`,
        `'Wo findet ${appointments[3].name} statt?'`
    ];
    artyom.addCommands({
        description: "Liste alle Termine",
        indexes: [/was habe ich heute vor/, /alle Termine/],
        smart: true,
        action: function (_i) {
            artyom.say("Du hast heute vor: ");
            listAppointments(appointments, []);
        }
    });
    artyom.addCommands({
        description: "appointment X",
        indexes: ["* Termin"],
        smart: true,
        action: function (_i, _wildcard) {
            appointmentByCounter(_wildcard);
        }
    });
    mapAppointments();
    document.getElementById("start").addEventListener("click", start);
    function start() {
        artyom.fatality();
        setTimeout(function () {
            artyom.initialize({
                lang: "de-DE",
                continuous: true,
                listen: true,
                interimResults: true,
                debug: true
            }).then(function () {
                console.log("Ready!");
                artyom.say("Guten Morgen, Zeit aufzustehen. Es ist jetzt 8 Uhr. Für heute stehen mehrere Termine für dich an. Wenn du wissen willst was du heute geplant hast sag zum Beispiel 'Wie lautet mein erster Termin'");
            });
        }, 250);
    }
    function listAppointments(_unmentionedAppointments, _mentionedAppointments = []) {
        console.log(_unmentionedAppointments);
        for (const appointment of _unmentionedAppointments) {
            _mentionedAppointments.push(appointment);
            listAppointment(appointment);
        }
        promptAppointments(_mentionedAppointments);
    }
    function listAppointment(_appointment) {
        artyom.say(_appointment.name);
    }
    function listAppointmentDetailed(_appointment, time = true, location = true) {
        artyom.say(_appointment.name);
        artyom.say("um " + _appointment.time + " Uhr");
        artyom.say("in " + _appointment.location);
    }
    function appointmentByCounter(_wildcard, _mentionedAppointments = []) {
        let askedAppointment;
        let appointmentNumber;
        let appointmentCounter = [
            "erster",
            "zweiter",
            "dritter",
            "vierter",
            "fünfter",
            "sechster",
            "siebter",
            "achter",
            "neunter",
            "zehnter"
        ];
        for (const key in appointmentCounter) {
            if (_wildcard.match(appointmentCounter[key])) {
                appointmentNumber = appointmentCounter[key];
                askedAppointment = appointments[key];
                break;
            }
        }
        if (!askedAppointment) {
            if (_wildcard.match("letzter")) {
                appointmentNumber = "letzter";
                askedAppointment = appointments[appointments.length - 1];
            }
            else if (appointmentNumber) {
                artyom.say(`Ein ${appointmentNumber} Termin steht heute nicht auf dem Plan`);
                promptAppointments(_mentionedAppointments);
                return;
            }
        }
        if (askedAppointment) {
            _mentionedAppointments.push(askedAppointment);
            artyom.say(`Dein ${appointmentNumber} Termin lautet: `);
            listAppointmentDetailed(askedAppointment);
        }
        else {
            artyom.say("Das habe ich nicht Verstanden.");
        }
        promptAppointments(_mentionedAppointments);
    }
    function promptAppointments(_mentionedAppointments, _appointmentFound = true) {
        let unmentionedAppointments = appointments.filter(_value => !_mentionedAppointments.includes(_value));
        let suggestion;
        let question;
        if (unmentionedAppointments.length > 0) {
            suggestion = suggestions1.pop();
            question = `Du hast noch ${unmentionedAppointments.length == 1 ? "einen weiteren Termin" : (unmentionedAppointments.length + " weitere Termine")}. Wenn du wissen willst was du noch vor hast `;
        }
        else {
            suggestion = suggestions2.pop();
            question = `${_appointmentFound ? "" : "Das habe ich nicht Verstanden."} Wenn du genauere Informationen zu deinen Terminen haben willst `;
        }
        if (suggestion) {
            question += `sag zum Beispiel ${suggestion}.`;
        }
        else {
            question += "frag einfach nach. ";
            if (unmentionedAppointments.length == 0)
                question += "Wenn du nichts mehr Wissen willst sag einfach Stop";
        }
        artyom.newPrompt({
            question: question,
            smart: true,
            options: [
                /nächster Termin/,
                /((sonst noch)|(sonst)|(noch) vor)|(weiteren|anderen Termine)/,
                "* Termin",
                "Wo *",
                "Wann *",
                /^[Ss]topp?$/
            ],
            onMatch: (_index, _wildcard) => {
                switch (_index) {
                    case 0:
                        _mentionedAppointments.push(unmentionedAppointments[0]);
                        return () => {
                            listAppointmentDetailed(unmentionedAppointments[0]);
                            promptAppointments(_mentionedAppointments);
                        };
                    case 1:
                        return () => {
                            artyom.say("Deine anderen Termine lauten: ");
                            listAppointments(unmentionedAppointments, _mentionedAppointments);
                        };
                    case 2:
                        return () => appointmentByCounter(_wildcard, _mentionedAppointments);
                    case 3:
                    case 4:
                        let askedAppointment;
                        for (const key in appointmentsByName) {
                            let match = _wildcard.match(key.toLocaleLowerCase());
                            if (match) {
                                console.log(match);
                                askedAppointment = appointmentsByName[key];
                                break;
                            }
                        }
                        if (askedAppointment) {
                            _mentionedAppointments.push(askedAppointment);
                            return () => {
                                artyom.say(`Dein Termin ${askedAppointment.name} findet ${_index == 3 ? `in ${askedAppointment.location}` : `um ${askedAppointment.time} Uhr`} statt`);
                                promptAppointments(_mentionedAppointments);
                            };
                        }
                        else {
                            return () => {
                                promptAppointments(_mentionedAppointments, false);
                            };
                        }
                    default:
                        return () => {
                            artyom.say("Okay ich hoffe ich konnte dir behilflich sein");
                        };
                }
            }
        });
    }
    function mapAppointments() {
        appointmentsByName = {};
        for (const appointment of appointments) {
            appointmentsByName[appointment.name] = appointment;
        }
    }
});
//# sourceMappingURL=artyom-script.js.map