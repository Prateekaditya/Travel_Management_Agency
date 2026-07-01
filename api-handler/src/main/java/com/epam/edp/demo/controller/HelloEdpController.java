package com.epam.edp.demo.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Simple health-check controller.
 *
 * @author Pavlo_Yemelianov
 */
@RestController
public class HelloEdpController {

    /**
     * Returns a greeting message. Can be used as a basic liveness probe.
     *
     * @return a static greeting string
     */
    @GetMapping(value = "/hello")
    public String hello() {
        return "Hello, Nexus!";
    }
}
