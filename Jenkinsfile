pipeline {
    agent {
        docker {
            image 'node:16.14.2'
            reuseNode true
            args '-v /etc/passwd:/etc/passwd:ro -v /etc/group:/etc/group:ro -v /etc/shadow:/etc/shadow:ro'
        }
    }
    stages {
        stage('Build') {
            steps {
                script {
                    sshagent(['ssh-key-global']) {
                        sh 'npm cache clean -f --cache="$WORKSPACE/.npm"'
                        sh 'rm -rf node_modules package-lock.json'
                        sh 'GIT_SSH_COMMAND="ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no" npm install --cache="$WORKSPACE/.npm"'
                        // sh 'npm run lint --cache="$WORKSPACE/.npm"'
                    }
                }
            }
        }
        stage('Test') {
            steps {
                script {
                    sshagent(['ssh-key-global']) {
                        sh 'npm run test --cache="$WORKSPACE/.npm"'
                    }
                }
            }
        }
        stage('Quality') {
            steps {
                script {
                    def scannerHome = tool 'sonar-scanner';
                    withSonarQubeEnv('sonarqube') {
                        sh "wget -q https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-4.7.0.2747-linux.zip"
                        sh "unzip -qq -o sonar-scanner-cli-4.7.0.2747-linux.zip"
                        sh "ls -al sonar-scanner-4.7.0.2747-linux/bin"

                        sh "SONAR_USER_HOME=${WORKSPACE}/.sonar XDG_CONFIG_HOME=${WORKSPACE}/.config ./sonar-scanner-4.7.0.2747-linux/bin/sonar-scanner -D\"sonar.host.url=${env.SONAR_HOST_URL}\" -D\"sonar.login=${env.SONAR_AUTH_TOKEN}\""
                    }
                }
            }
        }
    }
}