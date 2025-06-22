module.exports = {
  apps: [{
    name: 'codemarque-bot',
    script: './src/index.js',
    instances: 1,
    exec_mode: 'fork',
    
    // Run with Docker group permissions
    interpreter: 'bash',
    interpreter_args: '-c',
    script: 'sg docker -c "node ./src/index.js"',
    
    // Environment variables
    env: {
      NODE_ENV: 'production'
    },
    
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Process management
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'temp'],
    
    // Restart behavior
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Memory management
    max_memory_restart: '500M',
    
    // Advanced features
    merge_logs: true,
    autorestart: true,
    
    // Docker-specific settings
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};