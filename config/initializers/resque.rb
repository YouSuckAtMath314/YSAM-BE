if Rails.env.production?
  ENV["REDISTOGO_URL"] ||= "redis://username:password@host:1234/"

  uri = URI.parse(ENV["REDISTOGO_URL"])
  $redis = Resque.redis = Redis.new(:host => uri.host, :port => uri.port, :password => uri.password)
else
  $redis = Resque.redis = Redis.new
end

puts "%% Resque initialized %%"
