package com.aliali.notice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class NoticeBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(NoticeBackendApplication.class, args);
    }
}
