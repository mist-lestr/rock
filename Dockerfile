FROM gcr.io/distroless/static:nonroot
ARG TARGETOS
ARG TARGETARCH

WORKDIR /
COPY "target/rock_${TARGETOS}_${TARGETARCH}" /rock
USER 65532:65532
EXPOSE 3000

ENTRYPOINT ["/rock"]

CMD ["run"]