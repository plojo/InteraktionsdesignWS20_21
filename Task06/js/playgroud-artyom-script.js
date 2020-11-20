let commands;
window.addEventListener("load", function () {
    const artyom = new Artyom();
    let userName = "Jonas";
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
        }
    ];
    let appointmentsByName;
    artyom.addCommands({
        description: "Liste alle Termine",
        indexes: [/was habe ich heute vor/, /alle Termine/],
        smart: true,
        action: function (_i) {
            artyom.say("Du hast heute vor: ");
            listAppointments(appointments);
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
            });
        }, 250);
    }
    mapAppointments();
    document.getElementById("start").addEventListener("click", start);
    function listAppointments(_appointments, _exclude = []) {
        let remainingAppointments = appointments.filter(_value => !_exclude.includes(_value));
        for (const appointment of remainingAppointments) {
            listAppointment(appointment);
        }
        promptAskForDetails();
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
            "dritter"
        ];
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
    function promptNextAppointment(_mentionedAppointments) {
        let remainingAppointments = appointments.filter(_value => !_mentionedAppointments.includes(_value));
        let randomSuggestion = [
            "'Wie lautet mein nächster Termin'",
            "'Was habe ich noch vor'",
            "'Wie lautet mein erster Termin'",
            "'Wie lautet mein zweiter Termin'",
        ][Math.floor(Math.random() * 4)];
        let question = `Du hast noch ${remainingAppointments.length == 1 ? "einen weiteren Termin" : (remainingAppointments.length + " weitere Termine")}. Wenn du wissen willst was du noch vor hast `;
        if (_mentionedAppointments.length <= 2) {
            question += `sag zum Beispiel ${randomSuggestion}`;
        }
        else {
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
                onMatch: (_index, _wildcard) => {
                    switch (_index) {
                        case 0:
                            _mentionedAppointments.push(remainingAppointments[0]);
                            return () => {
                                listAppointmentDetailed(remainingAppointments[0]);
                                promptNextAppointment(_mentionedAppointments);
                            };
                        case 1:
                            return () => {
                                artyom.say("Deine anderen Termine lauten: ");
                                listAppointments(remainingAppointments, _mentionedAppointments);
                            };
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
    function promptAskForDetails(_promptCounter = 0, _appointmentFound = true) {
        let question = `${_appointmentFound ? "" : "Das habe ich nicht Verstanden."} Wenn du ${_promptCounter < 1 ? "genauere" : "weitere"} Informationen zu deinen Terminen haben willst `;
        if (_promptCounter < 1)
            question += `sag zum Beispiel 'Wo findet ${appointments[0].name} statt?'`;
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
            onMatch: (_index, _wildcard) => {
                let askedAppointment;
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
                    };
                switch (_index) {
                    case 0:
                        return () => {
                            artyom.say(`Dein Termin ${askedAppointment.name} findet in ${askedAppointment.location} statt`);
                            if (_promptCounter < 3)
                                promptAskForDetails(_promptCounter);
                        };
                    case 1:
                        return () => {
                            artyom.say(`Dein Termin ${askedAppointment.name} ist um ${askedAppointment.time} Uhr`);
                            if (_promptCounter < 3)
                                promptAskForDetails(_promptCounter);
                        };
                    default:
                        return () => {
                            stop();
                        };
                }
            }
        });
    }
    function stop() {
        artyom.say("Okay ich hoffe ich konnte dir behilflich sein");
    }
    function mapAppointments() {
        appointmentsByName = {};
        for (const appointment of appointments) {
            appointmentsByName[appointment.name] = appointment;
        }
    }
});
//# sourceMappingURL=playgroud-artyom-script.js.map