<?php

namespace Tests\Feature\Sprint0;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SanctumSpaTest extends TestCase
{
    use RefreshDatabase;

    public function test_csrf_cookie_endpoint_responds(): void
    {
        $this->getJson('/sanctum/csrf-cookie')->assertNoContent();
    }

    public function test_authenticated_user_can_access_api_user_endpoint(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/user');

        $response->assertOk()->assertJsonPath('id', $user->id);
    }
}
