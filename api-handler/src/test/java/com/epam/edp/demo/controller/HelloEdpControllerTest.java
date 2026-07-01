package com.epam.edp.demo.controller;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HelloEdpControllerTest {

    private final HelloEdpController controller = new HelloEdpController();

    @Test
    void hello_returnsExpectedMessage() {
        assertThat(controller.hello()).isEqualTo("Hello, Nexus!");
    }
}
