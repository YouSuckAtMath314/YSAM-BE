class User
  attr_accessor :id
  attr_reader :params

  def initialize(id, params={})
    @id = id
    @params = params
  end

  def self.find(id)
    user = $redis.hget("users", id)
    if user
      user_params = ActiveSupport::JSON.decode($redis.hget("users", id))
    end
    self.new(id, user_params)
  end

  def save
    $redis.hset "users", id, params.to_json
  end

  def params=(p)
    @params ||= {}
    @params.merge!(p)
  end

  def to_json
    {:id => id, :params => params}.to_json
  end
end
